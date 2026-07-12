import { NextResponse } from "next/server";
import {
  PIN_RADIUS_METERS,
  isPinCost,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActivePinsNear, deductPoints } from "@/lib/pins";
import { validatePinText } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { lat, lng, text, cost: rawCost } = body as {
    lat?: number;
    lng?: number;
    text?: string;
    cost?: number;
  };

  if (typeof lat !== "number" || typeof lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  if (typeof text !== "string") {
    return jsonError("깃발 문구를 입력해주세요.");
  }

  const cost =
    typeof rawCost === "number" && isPinCost(rawCost)
      ? rawCost
      : undefined;
  if (cost === undefined) {
    return jsonError("깃발 포인트가 올바르지 않습니다.");
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

  const nearbyPins = await findActivePinsNear(lat, lng, PIN_RADIUS_METERS);
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
      radius_meters: PIN_RADIUS_METERS,
      status: "active",
      cost,
      expires_at: null,
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

  return NextResponse.json({
    pin,
    points: deductResult.newPoints,
  });
}
