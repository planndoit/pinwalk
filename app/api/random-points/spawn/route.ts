import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getRandomPointCount,
  getRandomPointExpiresMinutes,
  getRandomPointRadiusMeters,
  getRandomPointSpawnIntervalMinutes,
  getRandomPointValues,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRandomPointWithinRadius } from "@/lib/geo";
import { annotateRandomPointsTerritory } from "@/lib/randomPoints/territory";
import type { RandomPoint } from "@/types/randomPoint";

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
    const spawnIntervalMinutes = getRandomPointSpawnIntervalMinutes();
    const lastSpawn = new Date(profile.last_random_point_spawn_at);
    const cooldownEnd = new Date(
      lastSpawn.getTime() + spawnIntervalMinutes * 60 * 1000
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
    expiresAt.getMinutes() + getRandomPointExpiresMinutes()
  );
  const now = new Date().toISOString();

  const spawnRadiusMeters = getRandomPointRadiusMeters();
  const randomPointCount = getRandomPointCount();
  const randomPointValues = getRandomPointValues();

  const pointsToInsert = Array.from({ length: randomPointCount }, () => {
    const coords = generateRandomPointWithinRadius(
      current_lat,
      current_lng,
      spawnRadiusMeters
    );
    const value =
      randomPointValues[
        Math.floor(Math.random() * randomPointValues.length)
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

  const annotated = await annotateRandomPointsTerritory(
    randomPoints as RandomPoint[],
    user.id
  );

  const ownBonusCount = annotated.filter((p) => p.territory?.inOwnTerritory)
    .length;
  const tollCount = annotated.filter(
    (p) => (p.territory?.otherPinCount ?? 0) > 0
  ).length;

  let message = "주변에 포인트가 생겼어요. 가까이 다가가서 획득해보세요.";
  if (ownBonusCount > 0 && tollCount > 0) {
    message =
      "주변에 포인트가 생겼어요. 내 영역은 2배, 다른 사람 영역에서는 통행료가 나요.";
  } else if (ownBonusCount > 0) {
    message =
      "주변에 포인트가 생겼어요. 내 영역 안 포인트는 2배로 가져가요.";
  } else if (tollCount > 0) {
    message =
      "주변에 포인트가 생겼어요. 다른 사람 영역이면 주인이 통행료 10%를 받아요.";
  }

  return NextResponse.json({
    randomPoints: annotated,
    message,
  });
}
