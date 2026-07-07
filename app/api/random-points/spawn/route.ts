import { NextResponse } from "next/server";
import {
  RANDOM_POINT_COUNT,
  RANDOM_POINT_EXPIRES_MINUTES,
  RANDOM_POINT_RADIUS_METERS,
  RANDOM_POINT_SPAWN_INTERVAL_MINUTES,
  RANDOM_POINT_VALUES,
} from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRandomPointWithinRadius } from "@/lib/geo";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { current_lat, current_lng } = body as {
    current_lat?: number;
    current_lng?: number;
  };

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("last_random_point_spawn_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("프로필을 찾을 수 없습니다.", 404);
  }

  if (profile.last_random_point_spawn_at) {
    const lastSpawn = new Date(profile.last_random_point_spawn_at);
    const cooldownEnd = new Date(
      lastSpawn.getTime() +
        RANDOM_POINT_SPAWN_INTERVAL_MINUTES * 60 * 1000
    );

    if (cooldownEnd > new Date()) {
      const remainingMs = cooldownEnd.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return jsonError(
        `${remainingMin}분 후에 다시 생성할 수 있어요.`,
        429
      );
    }
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(
    expiresAt.getMinutes() + RANDOM_POINT_EXPIRES_MINUTES
  );
  const now = new Date().toISOString();

  const pointsToInsert = Array.from({ length: RANDOM_POINT_COUNT }, () => {
    const coords = generateRandomPointWithinRadius(
      current_lat,
      current_lng,
      RANDOM_POINT_RADIUS_METERS
    );
    const value =
      RANDOM_POINT_VALUES[
        Math.floor(Math.random() * RANDOM_POINT_VALUES.length)
      ];

    return {
      user_id: user.id,
      lat: coords.lat,
      lng: coords.lng,
      points: value,
      status: "active" as const,
      expires_at: expiresAt.toISOString(),
    };
  });

  const { data: randomPoints, error: insertError } = await admin
    .from("random_points")
    .insert(pointsToInsert)
    .select();

  if (insertError || !randomPoints) {
    return jsonError("랜덤 포인트 생성에 실패했습니다.", 500);
  }

  await admin
    .from("profiles")
    .update({
      last_random_point_spawn_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  return NextResponse.json({
    randomPoints,
    message: "주변에 포인트가 생겼어요. 가까이 다가가서 획득해보세요.",
  });
}
