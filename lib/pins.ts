import { getMaxPinRadiusMeters } from "./env";
import { getBoundingBoxDelta, getDistanceMeters } from "./geo";
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

    const { data, error } = await admin
      .from("pins")
      .select("*, pin_landmarks!inner(landmark_id)")
      .eq("status", "active")
      .in("pin_landmarks.landmark_id", uniqueLandmarkIds)
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);

    if (error || !data) return [];

    return (data as PinWithLandmarkLinks[]).filter((pin) => {
      const distance = getDistanceMeters(lat, lng, pin.lat, pin.lng);
      const conflictRadius = Math.max(pin.radius_meters, newPinRadiusMeters);
      return distance <= conflictRadius;
    });
  }

  const searchRadiusMeters = Math.max(
    getMaxPinRadiusMeters(),
    newPinRadiusMeters
  );
  const { latDelta, lngDelta } = getBoundingBoxDelta(searchRadiusMeters, lat);

  const { data, error } = await admin
    .from("pins")
    .select("*, pin_landmarks(landmark_id)")
    .eq("status", "active")
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data) {
    return [];
  }

  return (data as PinWithLandmarkLinks[]).filter((pin) => {
    const distance = getDistanceMeters(lat, lng, pin.lat, pin.lng);
    if ((pin.pin_landmarks ?? []).length > 0) {
      return distance <= pin.radius_meters;
    }
    const conflictRadius = Math.max(pin.radius_meters, newPinRadiusMeters);
    return distance <= conflictRadius;
  });
}

type PinWithLandmarkLinks = Pin & {
  pin_landmarks: { landmark_id: string }[] | null;
};

type PointTransactionResult = {
  success: boolean;
  error?: string;
  newPoints?: number;
};

type ApplyPointTransactionRow = {
  success: boolean;
  new_points: number | null;
  error_code: string | null;
};

async function applyPointTransaction(
  userId: string,
  signedAmount: number,
  type: string,
  description: string,
  relatedId: string | undefined,
  failureMessage: string
): Promise<PointTransactionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("apply_point_transaction", {
    target_user_id: userId,
    target_amount: signedAmount,
    target_type: type,
    target_description: description,
    target_related_id: relatedId ?? null,
  });

  if (error) {
    console.error("apply_point_transaction failed:", error);
    return { success: false, error: failureMessage };
  }

  const row = ((data ?? []) as ApplyPointTransactionRow[])[0];
  if (!row) {
    return { success: false, error: failureMessage };
  }

  if (!row.success) {
    if (row.error_code === "insufficient_points") {
      return { success: false, error: "포인트가 부족합니다." };
    }
    if (row.error_code === "profile_not_found") {
      return { success: false, error: "프로필을 찾을 수 없습니다." };
    }
    return { success: false, error: failureMessage };
  }

  return { success: true, newPoints: Number(row.new_points) };
}

export async function deductPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<PointTransactionResult> {
  return applyPointTransaction(
    userId,
    -amount,
    type,
    description,
    relatedId,
    "포인트 차감에 실패했습니다."
  );
}

export async function addPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<PointTransactionResult> {
  return applyPointTransaction(
    userId,
    amount,
    type,
    description,
    relatedId,
    "포인트 지급에 실패했습니다."
  );
}
