import { after, NextResponse } from "next/server";
import {
  CONQUER_PROBABILITIES,
  DEFAULT_NICKNAME,
  DEFAULT_PIN_COST,
  LANDMARK_PIN_RADIUS_METERS,
  normalizePinCost,
  type ConquerProbability,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPoints, deductPoints } from "@/lib/pins";
import { getDistanceMeters } from "@/lib/geo";
import { getPinRadiusMeters } from "@/lib/env";
import {
  calculateConquerCost,
  calculateDefenseReward,
  rollConquerSuccess,
} from "@/lib/points";
import { validatePinText } from "@/lib/validation";
import {
  findContainingLandmarks,
} from "@/lib/landmark/zone";
import { refreshUsersLandmarkScores } from "@/lib/landmark/scores";
import { refreshCrewLandmarkScoresForUsers } from "@/lib/crew/scores";
import {
  addPinLandmarks,
  getPinLandmarkIds,
} from "@/lib/landmark/pinLandmarks";
import {
  notifyConquerAttemptResult,
  notifyPinConquered,
  notifyPinDefenseSuccess,
} from "@/lib/notifications/events";
import { recordRegionVisit } from "@/lib/visits/recordVisit";

async function resolvePinLandmarkIds(pin: {
  id: string;
  lat: number;
  lng: number;
}): Promise<string[]> {
  const linked = await getPinLandmarkIds(pin.id);
  if (linked.length > 0) return linked;
  const containing = await findContainingLandmarks(pin.lat, pin.lng);
  return containing.map((landmark) => landmark.id);
}

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
    return jsonError("깃발 문구를 입력해주세요.");
  }

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const validation = validatePinText(new_text);
  if (!validation.valid) {
    return jsonError(validation.error!);
  }

  const probability = selected_probability as ConquerProbability;
  const admin = createAdminClient();

  const [{ data: targetPin, error: pinError }, { data: attackerProfile }] =
    await Promise.all([
      admin.from("pins").select("*").eq("id", target_pin_id).single(),
      admin
        .from("profiles")
        .select("nickname, avatar_mime, avatar_updated_at")
        .eq("id", user.id)
        .single(),
    ]);

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

  const pinCost = normalizePinCost(
    typeof targetPin.cost === "number" ? targetPin.cost : DEFAULT_PIN_COST
  );
  const pinRadiusMeters =
    typeof targetPin.radius_meters === "number"
      ? targetPin.radius_meters
      : getPinRadiusMeters();

  if (distance > pinRadiusMeters) {
    return jsonError("핀 반경 안에 있어야 점령할 수 있습니다.");
  }

  const cost = calculateConquerCost(probability, pinCost);

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

  const success = rollConquerSuccess(probability);
  const now = new Date().toISOString();
  const ownerUserId = targetPin.user_id as string;
  const targetPinText = targetPin.text as string;

  if (!success) {
    const defenseReward = calculateDefenseReward(probability, pinCost);
    const rewardOwner =
      ownerUserId !== user.id && defenseReward > 0
        ? addPoints(
            ownerUserId,
            defenseReward,
            "defense_reward",
            "공격을 막아냈어요",
            target_pin_id
          )
        : null;

    await Promise.all([
      admin.from("pin_attempts").insert({
        attacker_id: user.id,
        target_pin_id,
        selected_probability: probability,
        cost,
        success: false,
      }),
      rewardOwner,
    ]);

    if (ownerUserId !== user.id) {
      after(async () => {
        await Promise.all([
          notifyPinDefenseSuccess({
            ownerUserId,
            pinId: target_pin_id,
            reward: defenseReward,
            pinText: targetPinText,
            lat: Number(targetPin.lat),
            lng: Number(targetPin.lng),
          }),
          notifyConquerAttemptResult({
            attackerUserId: user.id,
            ownerUserId,
            pinId: target_pin_id,
            pinText: targetPinText,
            lat: Number(targetPin.lat),
            lng: Number(targetPin.lng),
            success: false,
          }),
        ]);
      });
    }

    return NextResponse.json({
      success: false,
      message: "점령 실패! 기존 깃발이 버텼어요.",
      points: deductResult.newPoints,
    });
  }

  const [, landmarkIds] = await Promise.all([
    admin
      .from("pins")
      .update({
        status: "conquered",
        conquered_by: user.id,
        conquered_at: now,
        updated_at: now,
      })
      .eq("id", target_pin_id),
    resolvePinLandmarkIds({
      id: target_pin_id,
      lat: targetPin.lat,
      lng: targetPin.lng,
    }),
  ]);
  const inLandmarkZone = landmarkIds.length > 0;

  const newRadius = inLandmarkZone
    ? LANDMARK_PIN_RADIUS_METERS
    : getPinRadiusMeters();

  const { data: newPin, error: createError } = await admin
    .from("pins")
    .insert({
      user_id: user.id,
      text: new_text.trim(),
      lat: targetPin.lat,
      lng: targetPin.lng,
      radius_meters: newRadius,
      status: "active",
      cost: pinCost,
      expires_at: null,
      last_reinforced_at: null,
    })
    .select()
    .single();

  if (createError || !newPin) {
    return jsonError("새 깃발 생성에 실패했습니다.", 500);
  }

  const applyLandmarks = async () => {
    if (!inLandmarkZone) return;
    await addPinLandmarks(newPin.id, landmarkIds);
    await Promise.all([
      refreshUsersLandmarkScores(landmarkIds, [ownerUserId, user.id]),
      refreshCrewLandmarkScoresForUsers(landmarkIds, [ownerUserId, user.id]),
    ]);
  };

  await Promise.all([
    admin.from("pin_attempts").insert({
      attacker_id: user.id,
      target_pin_id,
      new_pin_id: newPin.id,
      selected_probability: probability,
      cost,
      success: true,
    }),
    applyLandmarks(),
  ]);

  after(async () => {
    await Promise.all([
      notifyPinConquered({
        ownerUserId,
        attackerUserId: user.id,
        pinId: newPin.id as string,
        pinText: targetPinText,
        lat: Number(newPin.lat),
        lng: Number(newPin.lng),
      }),
      notifyConquerAttemptResult({
        attackerUserId: user.id,
        ownerUserId,
        pinId: newPin.id as string,
        pinText: targetPinText,
        lat: Number(newPin.lat),
        lng: Number(newPin.lng),
        success: true,
      }),
    ]);
  });

  after(async () => {
    try {
      await recordRegionVisit({
        userId: user.id,
        lat: Number(newPin.lat),
        lng: Number(newPin.lng),
        visitedAt:
          typeof newPin.created_at === "string"
            ? newPin.created_at
            : new Date().toISOString(),
      });
    } catch (error) {
      console.error("recordRegionVisit failed:", error);
    }
  });

  return NextResponse.json({
    success: true,
    message: "점령 성공! 이 영역에 내 깃발을 꽂았어요.",
    pin: {
      ...newPin,
      nickname:
        (attackerProfile?.nickname as string | null | undefined) ??
        DEFAULT_NICKNAME,
      has_avatar: Boolean(attackerProfile?.avatar_mime),
      avatar_updated_at:
        (attackerProfile?.avatar_updated_at as string | null | undefined) ?? null,
      landmark_ids: landmarkIds,
    },
    points: deductResult.newPoints,
  });
}
