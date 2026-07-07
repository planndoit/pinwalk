import { NextResponse } from "next/server";
import {
  CREATE_PIN_COST,
  PIN_DURATION_HOURS,
  PIN_RADIUS_METERS,
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
  const { lat, lng, text } = body as {
    lat?: number;
    lng?: number;
    text?: string;
  };

  if (typeof lat !== "number" || typeof lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  if (typeof text !== "string") {
    return jsonError("핀 문구를 입력해주세요.");
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

  if (!profile || profile.points < CREATE_PIN_COST) {
    return jsonError("포인트가 부족합니다.");
  }

  const nearbyPins = await findActivePinsNear(lat, lng, PIN_RADIUS_METERS);
  if (nearbyPins.length > 0) {
    return jsonError(
      "이미 점령된 영역입니다. 점령에 도전해보세요.",
      409
    );
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PIN_DURATION_HOURS);

  const { data: pin, error } = await admin
    .from("pins")
    .insert({
      user_id: user.id,
      text: text.trim(),
      lat,
      lng,
      radius_meters: PIN_RADIUS_METERS,
      status: "active",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !pin) {
    return jsonError("핀 생성에 실패했습니다.", 500);
  }

  const deductResult = await deductPoints(
    user.id,
    CREATE_PIN_COST,
    "create_pin",
    "발도장 생성",
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
