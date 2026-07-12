import { NextResponse } from "next/server";
import {
  CONQUER_PROBABILITIES,
  DEFAULT_PIN_COST,
  PIN_RADIUS_METERS,
  type ConquerProbability,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPoints, deductPoints } from "@/lib/pins";
import { getDistanceMeters } from "@/lib/geo";
import {
  calculateConquerCost,
  calculateDefenseReward,
  rollConquerSuccess,
} from "@/lib/points";
import { validatePinText } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const {
    target_pin_id,
    selected_probability,
    new_text,
    current_lat,
    current_lng,
  } = body as {
    target_pin_id?: string;
    selected_probability?: number;
    new_text?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (!target_pin_id) {
    return jsonError("대상 핀이 필요합니다.");
  }

  if (
    typeof selected_probability !== "number" ||
    !CONQUER_PROBABILITIES.includes(
      selected_probability as ConquerProbability
    )
  ) {
    return jsonError("유효하지 않은 확률입니다.");
  }

  if (typeof new_text !== "string") {
    return jsonError("핀 문구를 입력해주세요.");
  }

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const validation = validatePinText(new_text);
  if (!validation.valid) {
    return jsonError(validation.error!);
  }

  const probability = selected_probability as ConquerProbability;
  const cost = calculateConquerCost(probability);
  const admin = createAdminClient();

  const { data: targetPin, error: pinError } = await admin
    .from("pins")
    .select("*")
    .eq("id", target_pin_id)
    .single();

  if (pinError || !targetPin) {
    return jsonError("대상 핀을 찾을 수 없습니다.", 404);
  }

  if (targetPin.status !== "active") {
    return jsonError("이미 점령된 핀입니다.");
  }

  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    targetPin.lat,
    targetPin.lng
  );

  if (distance > PIN_RADIUS_METERS) {
    return jsonError("핀 반경 안에 있어야 점령할 수 있습니다.");
  }

  const deductResult = await deductPoints(
    user.id,
    cost,
    "conquer_attempt",
    `확률 점령 시도 (${probability}%)`,
    target_pin_id
  );

  if (!deductResult.success) {
    return jsonError(deductResult.error!);
  }

  const pinCost =
    typeof targetPin.cost === "number" ? targetPin.cost : DEFAULT_PIN_COST;
  const success = rollConquerSuccess(probability, pinCost);
  const now = new Date().toISOString();

  if (!success) {
    await admin.from("pin_attempts").insert({
      attacker_id: user.id,
      target_pin_id,
      selected_probability: probability,
      cost,
      success: false,
    });

    const defenseReward = calculateDefenseReward(probability);
    if (defenseReward > 0 && targetPin.user_id !== user.id) {
      await addPoints(
        targetPin.user_id,
        defenseReward,
        "defense_reward",
        "공격을 막아냈어요",
        target_pin_id
      );
    }

    return NextResponse.json({
      success: false,
      message: "점령 실패! 기존 깃발이 버텼어요.",
      points: deductResult.newPoints,
    });
  }

  await admin
    .from("pins")
    .update({
      status: "conquered",
      conquered_by: user.id,
      conquered_at: now,
      updated_at: now,
    })
    .eq("id", target_pin_id);

  const { data: newPin, error: createError } = await admin
    .from("pins")
    .insert({
      user_id: user.id,
      text: new_text.trim(),
      lat: targetPin.lat,
      lng: targetPin.lng,
      radius_meters: PIN_RADIUS_METERS,
      status: "active",
      cost: DEFAULT_PIN_COST,
      expires_at: null,
    })
    .select()
    .single();

  if (createError || !newPin) {
    return jsonError("새 핀 생성에 실패했습니다.", 500);
  }

  await admin.from("pin_attempts").insert({
    attacker_id: user.id,
    target_pin_id,
    new_pin_id: newPin.id,
    selected_probability: probability,
    cost,
    success: true,
  });

  return NextResponse.json({
    success: true,
    message: "점령 성공! 이 영역에 내 깃발을 꽂았어요.",
    pin: newPin,
    points: deductResult.newPoints,
  });
}
