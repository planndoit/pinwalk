import { getMaxPinRadiusMeters } from "./env";
import { getBoundingBoxDelta, getDistanceMeters } from "./geo";
import { getLandmarkIdsByPinIds } from "./landmark/pinLandmarks";
import { createAdminClient } from "./supabase/admin";
import type { Pin } from "@/types/pin";

/**
 * 새 깃발 위치와 충돌하는 활성 핀을 찾는다.
 * newPinRadiusMeters가 있으면 기존 반경·신규 반경 중 큰 쪽을 기준으로 한다
 * (한쪽 중심이 다른 쪽 영토 안에 들어오면 충돌).
 */
export async function findActivePinsNear(
  lat: number,
  lng: number,
  newPinRadiusMeters?: number
): Promise<Pin[]> {
  return findPinPlacementConflicts(lat, lng, newPinRadiusMeters ?? 0, []);
}

/**
 * 배치 충돌 검사.
 * - landmarkIds 있으면: 공유 랜드마크 깃발끼리만, 반경 max(신규,기존)
 * - 없으면: 일반 규칙은 max(기존,신규). 단 랜드마크 깃발은 본인 반경(5m)만 적용
 */
export async function findPinPlacementConflicts(
  lat: number,
  lng: number,
  newPinRadiusMeters: number,
  landmarkIds: string[]
): Promise<Pin[]> {
  const admin = createAdminClient();
  const uniqueLandmarkIds = [...new Set(landmarkIds.filter(Boolean))];

  if (uniqueLandmarkIds.length > 0) {
    const searchRadiusMeters = Math.max(newPinRadiusMeters, 50);
    const { latDelta, lngDelta } = getBoundingBoxDelta(searchRadiusMeters, lat);

    const { data: links, error: linkError } = await admin
      .from("pin_landmarks")
      .select("pin_id")
      .in("landmark_id", uniqueLandmarkIds);

    if (linkError || !links || links.length === 0) return [];

    const pinIds = [...new Set(links.map((row) => row.pin_id as string))];

    const { data, error } = await admin
      .from("pins")
      .select("*")
      .eq("status", "active")
      .in("id", pinIds)
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);

    if (error || !data) return [];

    return data.filter((pin) => {
      const distance = getDistanceMeters(lat, lng, pin.lat, pin.lng);
      const conflictRadius = Math.max(pin.radius_meters, newPinRadiusMeters);
      return distance <= conflictRadius;
    }) as Pin[];
  }

  const searchRadiusMeters = Math.max(
    getMaxPinRadiusMeters(),
    newPinRadiusMeters
  );
  const { latDelta, lngDelta } = getBoundingBoxDelta(searchRadiusMeters, lat);

  const { data, error } = await admin
    .from("pins")
    .select("*")
    .eq("status", "active")
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data) {
    return [];
  }

  const landmarkIdsByPin = await getLandmarkIdsByPinIds(
    data.map((pin) => pin.id as string)
  );

  return data.filter((pin) => {
    const distance = getDistanceMeters(lat, lng, pin.lat, pin.lng);
    const pinLandmarkIds = landmarkIdsByPin.get(pin.id as string) ?? [];
    if (pinLandmarkIds.length > 0) {
      return distance <= pin.radius_meters;
    }
    const conflictRadius = Math.max(pin.radius_meters, newPinRadiusMeters);
    return distance <= conflictRadius;
  }) as Pin[];
}

export async function deductPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<{ success: boolean; error?: string; newPoints?: number }> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "프로필을 찾을 수 없습니다." };
  }

  if (profile.points < amount) {
    return { success: false, error: "포인트가 부족합니다." };
  }

  const newPoints = profile.points - amount;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ points: newPoints, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: "포인트 차감에 실패했습니다." };
  }

  const { error: txError } = await admin.from("point_transactions").insert({
    user_id: userId,
    amount: -amount,
    type,
    description,
    related_id: relatedId ?? null,
  });

  if (txError) {
    return { success: false, error: "거래 기록 저장에 실패했습니다." };
  }

  return { success: true, newPoints };
}

export async function addPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<{ success: boolean; error?: string; newPoints?: number }> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "프로필을 찾을 수 없습니다." };
  }

  const newPoints = profile.points + amount;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ points: newPoints, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: "포인트 지급에 실패했습니다." };
  }

  const { error: txError } = await admin.from("point_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    related_id: relatedId ?? null,
  });

  if (txError) {
    return { success: false, error: "거래 기록 저장에 실패했습니다." };
  }

  return { success: true, newPoints };
}
