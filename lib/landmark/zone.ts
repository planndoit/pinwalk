import { LANDMARK_PIN_RADIUS_METERS } from "@/lib/constants";
import { getBoundingBoxDelta, getDistanceMeters } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

export type LandmarkZone = Pick<
  Landmark,
  "id" | "lat" | "lng" | "radius_meters" | "map_visible"
>;

/** 좌표가 들어가는 map_visible 랜드마크. 여러 개면 중심이 더 가까운 쪽. */
export async function findContainingLandmark(
  lat: number,
  lng: number
): Promise<LandmarkZone | null> {
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
    return null;
  }

  let best: LandmarkZone | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of data as LandmarkZone[]) {
    const distance = getDistanceMeters(lat, lng, row.lat, row.lng);
    if (distance > row.radius_meters) continue;
    if (distance < bestDistance) {
      best = row;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * 랜드마크 존 안 active 깃발을 5m로 편입하고 landmark_id를 붙인다.
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
    .select("id, user_id, lat, lng, landmark_id, radius_meters")
    .eq("status", "active")
    .gte("lat", landmark.lat - latDelta)
    .lte("lat", landmark.lat + latDelta)
    .gte("lng", landmark.lng - lngDelta)
    .lte("lng", landmark.lng + lngDelta);

  if (error || !data) {
    return [];
  }

  const affectedUserIds = new Set<string>();
  const now = new Date().toISOString();

  for (const pin of data) {
    const distance = getDistanceMeters(
      landmark.lat,
      landmark.lng,
      pin.lat,
      pin.lng
    );
    if (distance > landmark.radius_meters) continue;

    const needsUpdate =
      pin.landmark_id !== landmark.id ||
      pin.radius_meters !== LANDMARK_PIN_RADIUS_METERS;

    if (needsUpdate) {
      await admin
        .from("pins")
        .update({
          landmark_id: landmark.id,
          radius_meters: LANDMARK_PIN_RADIUS_METERS,
          updated_at: now,
        })
        .eq("id", pin.id);
    }

    affectedUserIds.add(pin.user_id);
  }

  return [...affectedUserIds];
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
