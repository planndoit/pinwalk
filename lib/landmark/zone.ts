import { LANDMARK_PIN_RADIUS_METERS } from "@/lib/constants";
import { getBoundingBoxDelta, getDistanceMeters } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkPinsToLandmark } from "@/lib/landmark/pinLandmarks";
import type { Landmark } from "@/types/landmark";

export type LandmarkZone = Pick<
  Landmark,
  "id" | "lat" | "lng" | "radius_meters" | "map_visible"
>;

/** 좌표가 들어가는 map_visible 랜드마크 전체 (겹치면 모두). */
export async function findContainingLandmarks(
  lat: number,
  lng: number
): Promise<LandmarkZone[]> {
  const admin = createAdminClient();
  const searchRadius = 2000;
  const { latDelta, lngDelta } = getBoundingBoxDelta(searchRadius, lat);

  const { data, error } = await admin
    .from("landmarks")
    .select("id, lat, lng, radius_meters, map_visible")
    .eq("map_visible", true)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data || data.length === 0) {
    return [];
  }

  const containing: LandmarkZone[] = [];

  for (const row of data as LandmarkZone[]) {
    const distance = getDistanceMeters(lat, lng, row.lat, row.lng);
    if (distance <= row.radius_meters) {
      containing.push(row);
    }
  }

  return containing;
}

/**
 * 랜드마크 존 안 active 깃발을 5m로 편입하고 pin_landmarks에 연결한다.
 * 반환: 영향받은 user_id 목록
 */
export async function absorbPinsIntoLandmark(
  landmark: LandmarkZone
): Promise<string[]> {
  const admin = createAdminClient();
  const { latDelta, lngDelta } = getBoundingBoxDelta(
    landmark.radius_meters,
    landmark.lat
  );

  const { data, error } = await admin
    .from("pins")
    .select("id, user_id, lat, lng, radius_meters")
    .eq("status", "active")
    .gte("lat", landmark.lat - latDelta)
    .lte("lat", landmark.lat + latDelta)
    .gte("lng", landmark.lng - lngDelta)
    .lte("lng", landmark.lng + lngDelta);

  if (error || !data) {
    return [];
  }

  const insidePins = data.filter(
    (pin) =>
      getDistanceMeters(landmark.lat, landmark.lng, pin.lat, pin.lng) <=
      landmark.radius_meters
  );
  if (insidePins.length === 0) {
    return [];
  }

  const resizePinIds = insidePins
    .filter((pin) => pin.radius_meters !== LANDMARK_PIN_RADIUS_METERS)
    .map((pin) => pin.id as string);

  await Promise.all([
    resizePinIds.length > 0
      ? admin
          .from("pins")
          .update({
            radius_meters: LANDMARK_PIN_RADIUS_METERS,
            updated_at: new Date().toISOString(),
          })
          .in("id", resizePinIds)
      : null,
    linkPinsToLandmark(
      insidePins.map((pin) => pin.id as string),
      landmark.id
    ),
  ]);

  return [...new Set(insidePins.map((pin) => pin.user_id as string))];
}

/** map_visible false → true 전환 시 편입. */
export async function absorbIfMapVisibleEnabled(
  previous: { map_visible: boolean } | null,
  next: LandmarkZone & { map_visible: boolean }
): Promise<string[]> {
  const wasVisible = previous?.map_visible === true;
  if (wasVisible || !next.map_visible) {
    return [];
  }
  return absorbPinsIntoLandmark(next);
}
