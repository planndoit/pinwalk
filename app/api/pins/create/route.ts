import { NextResponse } from "next/server";
import {
  LANDMARK_PIN_RADIUS_METERS,
  PIN_CREATE_COST,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPinPlacementConflicts, deductPoints } from "@/lib/pins";
import { validatePinText } from "@/lib/validation";
import { getPinRadiusMeters } from "@/lib/env";
import {
  absorbPinsIntoLandmark,
  findContainingLandmarks,
} from "@/lib/landmark/zone";
import { setPinLandmarks } from "@/lib/landmark/pinLandmarks";
import { refreshUsersLandmarkScores } from "@/lib/landmark/scores";
import { refreshCrewLandmarkScoresForUsers } from "@/lib/crew/scores";
import { recordRegionVisit } from "@/lib/visits/recordVisit";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { text, current_lat, current_lng } = body as {
    text?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("현재 위치 정보가 필요합니다.");
  }

  const lat = current_lat;
  const lng = current_lng;
  const cost = PIN_CREATE_COST;

  if (typeof text !== "string") {
    return jsonError("깃발 문구를 입력해주세요.");
  }

  const validation = validatePinText(text);
  if (!validation.valid) {
    return jsonError(validation.error!);
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .single();

  if (!profile || profile.points < cost) {
    return jsonError("포인트가 부족합니다.");
  }

  const containingLandmarks = await findContainingLandmarks(lat, lng);
  const landmarkIds = containingLandmarks.map((landmark) => landmark.id);

  for (const landmark of containingLandmarks) {
    await absorbPinsIntoLandmark(landmark);
  }

  const radiusMeters =
    landmarkIds.length > 0
      ? LANDMARK_PIN_RADIUS_METERS
      : getPinRadiusMeters();

  const nearbyPins = await findPinPlacementConflicts(
    lat,
    lng,
    radiusMeters,
    landmarkIds
  );
  if (nearbyPins.length > 0) {
    return jsonError(
      "이미 점령된 영역입니다. 점령에 도전해보세요.",
      409
    );
  }

  const { data: pin, error } = await admin
    .from("pins")
    .insert({
      user_id: user.id,
      text: text.trim(),
      lat,
      lng,
      radius_meters: radiusMeters,
      status: "active",
      cost,
      expires_at: null,
      last_reinforced_at: null,
    })
    .select()
    .single();

  if (error || !pin) {
    console.error("pins insert failed:", error);
    if (error?.code === "42501") {
      return jsonError(
        "깃발 생성에 실패했습니다. 서버의 SUPABASE_SERVICE_ROLE_KEY가 service_role 키인지 확인해주세요.",
        500
      );
    }
    return jsonError(
      error?.message
        ? `깃발 생성에 실패했습니다. (${error.message})`
        : "깃발 생성에 실패했습니다.",
      500
    );
  }

  const deductResult = await deductPoints(
    user.id,
    cost,
    "create_pin",
    `깃발 생성 (${cost}P)`,
    pin.id
  );

  if (!deductResult.success) {
    await admin.from("pins").delete().eq("id", pin.id);
    return jsonError(deductResult.error!);
  }

  if (landmarkIds.length > 0) {
    await setPinLandmarks(pin.id, landmarkIds);
    await refreshUsersLandmarkScores(landmarkIds, [user.id]);
    await refreshCrewLandmarkScoresForUsers(landmarkIds, [user.id]);
  }

  try {
    await recordRegionVisit({
      userId: user.id,
      lat,
      lng,
      visitedAt:
        typeof pin.created_at === "string"
          ? pin.created_at
          : new Date().toISOString(),
    });
  } catch (error) {
    console.error("recordRegionVisit failed:", error);
  }

  return NextResponse.json({
    pin: { ...pin, landmark_ids: landmarkIds },
    points: deductResult.newPoints,
  });
}
