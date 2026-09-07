import { NextResponse } from "next/server";
import {
  PIN_MAX_COST,
  PIN_TEXT_CHANGE_COST,
  normalizePinCost,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPoints, deductPoints } from "@/lib/pins";
import { getDistanceMeters } from "@/lib/geo";
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
    return jsonError("내 깃발만 문구를 변경할 수 있습니다.", 403);
  }

  if (pin.status !== "active") {
    return jsonError("활성 깃발만 문구를 변경할 수 있습니다.");
  }

  const currentCost = normalizePinCost(
    typeof pin.cost === "number" ? pin.cost : 100
  );
  if (currentCost < PIN_MAX_COST) {
    return jsonError(
      `투자 ${PIN_MAX_COST}P 깃발만 별도로 문구를 변경할 수 있습니다. 그 전에는 강화할 때 함께 바꿔 주세요.`
    );
  }

  if ((pin.text as string).trim() === trimmedText) {
    return jsonError("변경된 문구가 없습니다.");
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
    return jsonError("깃발 영역 안에서만 문구를 변경할 수 있습니다.");
  }

  const deductResult = await deductPoints(
    user.id,
    PIN_TEXT_CHANGE_COST,
    "update_pin_text",
    `깃발 문구 변경 (${PIN_TEXT_CHANGE_COST}P)`,
    pinId
  );

  if (!deductResult.success) {
    return jsonError(deductResult.error!);
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("pins")
    .update({
      text: trimmedText,
      updated_at: now,
    })
    .eq("id", pinId)
    .eq("status", "active")
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updated) {
    await addPoints(
      user.id,
      PIN_TEXT_CHANGE_COST,
      "admin_adjust",
      "깃발 문구 변경 실패 환불",
      pinId
    );
    return jsonError("깃발 문구 변경에 실패했습니다.", 500);
  }

  return NextResponse.json({
    pin: updated,
    points: deductResult.newPoints,
    message: "깃발 문구를 바꿨어요.",
  });
}
