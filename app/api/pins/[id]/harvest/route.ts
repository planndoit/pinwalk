import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistanceMeters } from "@/lib/geo";
import { getFixedPinRadiusMeters } from "@/lib/env";
import { REMOTE_HARVEST_MIN_TOTAL } from "@/lib/harvest";
import { harvestPins, isHarvestMode } from "@/lib/harvest/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id: pinId } = await params;
  if (!pinId) {
    return jsonError("깃발이 필요합니다.");
  }

  const body = await request.json();
  const { mode, current_lat, current_lng } = body as {
    mode?: unknown;
    current_lat?: number;
    current_lng?: number;
  };

  if (!isHarvestMode(mode)) {
    return jsonError("수확 방식이 올바르지 않습니다.");
  }

  if (
    mode === "direct" &&
    (typeof current_lat !== "number" || typeof current_lng !== "number")
  ) {
    return jsonError("현재 위치 정보가 필요합니다.");
  }

  const admin = createAdminClient();
  const { data: pin, error: pinError } = await admin
    .from("pins")
    .select("*")
    .eq("id", pinId)
    .single();

  if (pinError || !pin) {
    return jsonError("깃발을 찾을 수 없습니다.", 404);
  }

  if (pin.user_id !== user.id) {
    return jsonError("내 깃발만 수확할 수 있습니다.", 403);
  }

  if (pin.status !== "active") {
    return jsonError("활성 깃발만 수확할 수 있습니다.");
  }

  if (mode === "direct") {
    const radiusMeters =
      typeof pin.radius_meters === "number"
        ? pin.radius_meters
        : getFixedPinRadiusMeters();
    const distance = getDistanceMeters(
      current_lat as number,
      current_lng as number,
      pin.lat as number,
      pin.lng as number
    );
    if (distance > radiusMeters) {
      return jsonError("깃발 영역 안에서만 직접 수확할 수 있습니다.");
    }
  }

  const result = await harvestPins(user.id, [pinId], mode);

  if (!result.ok) {
    if (result.errorCode === "nothing_to_harvest") {
      return jsonError(
        mode === "direct"
          ? "아직 쌓인 수확 포인트가 없어요."
          : `${REMOTE_HARVEST_MIN_TOTAL}P 이상 쌓이면 원격 수확할 수 있어요.`
      );
    }
    if (result.errorCode === "pin_not_found") {
      return jsonError("활성 깃발만 수확할 수 있습니다.");
    }
    if (result.errorCode === "invalid_mode") {
      return jsonError("수확 방식이 올바르지 않습니다.");
    }
    return jsonError("수확에 실패했습니다.", 500);
  }

  const { data: updatedPin } = await admin
    .from("pins")
    .select("*")
    .eq("id", pinId)
    .maybeSingle();

  const message =
    mode === "direct"
      ? `직접 수확으로 ${result.granted.toLocaleString("ko-KR")}P를 받았어요!`
      : `원격 수확으로 ${result.granted.toLocaleString("ko-KR")}P를 받았어요.`;

  return NextResponse.json({
    pin: updatedPin ?? null,
    points: result.points,
    granted: result.granted,
    lost: result.harvestTotal - result.granted,
    message,
  });
}
