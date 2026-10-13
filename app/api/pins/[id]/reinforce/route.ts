import { NextResponse } from "next/server";
import {
  PIN_HARVEST_HOURLY_PERCENT,
  PIN_HARVEST_MAX_HOURS,
  PIN_MAX_COST,
  PIN_REINFORCE_COST,
  getNextPinCost,
  normalizePinCost,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPoints, deductPoints } from "@/lib/pins";
import { getDistanceMeters } from "@/lib/geo";
import { getPinReinforceAvailableAt } from "@/lib/flagVisual";
import { getPinLandmarkIds } from "@/lib/landmark/pinLandmarks";
import { refreshUsersLandmarkScores } from "@/lib/landmark/scores";
import { refreshCrewLandmarkScoresForUsers } from "@/lib/crew/scores";
import { validatePinText } from "@/lib/validation";
import { getFixedPinRadiusMeters } from "@/lib/env";

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
  const { current_lat, current_lng, text } = body as {
    current_lat?: number;
    current_lng?: number;
    text?: string;
  };

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("현재 위치 정보가 필요합니다.");
  }

  if (typeof text !== "string") {
    return jsonError("깃발 문구를 입력해주세요.");
  }

  const validation = validatePinText(text);
  if (!validation.valid) {
    return jsonError(validation.error!);
  }

  const trimmedText = text.trim();
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
    return jsonError("내 깃발만 강화할 수 있습니다.", 403);
  }

  if (pin.status !== "active") {
    return jsonError("활성 깃발만 강화할 수 있습니다.");
  }

  const currentCost = normalizePinCost(
    typeof pin.cost === "number" ? pin.cost : 100
  );
  const nextCost = getNextPinCost(currentCost);
  if (nextCost === null || currentCost >= PIN_MAX_COST) {
    return jsonError("이미 최대까지 강화된 깃발입니다.");
  }

  const radiusMeters =
    typeof pin.radius_meters === "number"
      ? pin.radius_meters
      : getFixedPinRadiusMeters();
  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    pin.lat as number,
    pin.lng as number
  );
  if (distance > radiusMeters) {
    return jsonError("깃발 영역 안에서만 강화할 수 있습니다.");
  }

  const availableAt = getPinReinforceAvailableAt({
    created_at: pin.created_at as string,
    last_reinforced_at: (pin.last_reinforced_at as string | null) ?? null,
  });
  if (Date.now() < availableAt.getTime()) {
    return jsonError("강화 쿨다운이 남아 있습니다. 나중에 다시 시도해주세요.");
  }

  const deductResult = await deductPoints(
    user.id,
    PIN_REINFORCE_COST,
    "reinforce_pin",
    `깃발 강화 (${currentCost}P → ${nextCost}P)`,
    pinId
  );

  if (!deductResult.success) {
    return jsonError(deductResult.error!);
  }

  const { data: updated, error: updateError } = await admin
    .rpc("reinforce_pin_with_harvest", {
      p_pin_id: pinId,
      p_user_id: user.id,
      p_next_cost: nextCost,
      p_text: trimmedText,
      p_hourly_percent: PIN_HARVEST_HOURLY_PERCENT,
      p_max_hours: PIN_HARVEST_MAX_HOURS,
    })
    .single();

  if (updateError || !updated) {
    await addPoints(
      user.id,
      PIN_REINFORCE_COST,
      "admin_adjust",
      "깃발 강화 실패 환불",
      pinId
    );
    return jsonError("깃발 강화에 실패했습니다.", 500);
  }

  const landmarkIds = await getPinLandmarkIds(pinId);
  if (landmarkIds.length > 0) {
    await refreshUsersLandmarkScores(landmarkIds, [user.id]);
    await refreshCrewLandmarkScoresForUsers(landmarkIds, [user.id]);
  }

  return NextResponse.json({
    pin: updated,
    points: deductResult.newPoints,
    message: `깃발을 ${nextCost}P로 강화했어요.`,
  });
}
