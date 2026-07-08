import { NextResponse } from "next/server";
import { RANDOM_POINT_CLAIM_RADIUS_METERS } from "@/lib/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPoints } from "@/lib/pins";
import { getDistanceMeters } from "@/lib/geo";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { random_point_id, current_lat, current_lng } = body as {
    random_point_id?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (!random_point_id) {
    return jsonError("포인트 ID가 필요합니다.");
  }

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const admin = createAdminClient();

  const { data: randomPoint, error } = await admin
    .from("random_points")
    .select("*")
    .eq("id", random_point_id)
    .eq("user_id", user.id)
    .single();

  if (error || !randomPoint) {
    return jsonError("포인트를 찾을 수 없습니다.", 404);
  }

  if (randomPoint.status !== "active") {
    return jsonError("이미 획득했거나 만료된 포인트입니다.");
  }

  if (new Date(randomPoint.expires_at) <= new Date()) {
    await admin
      .from("random_points")
      .update({ status: "expired" })
      .eq("id", random_point_id);
    return jsonError("만료된 포인트입니다.");
  }

  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    randomPoint.lat,
    randomPoint.lng
  );

  if (distance > RANDOM_POINT_CLAIM_RADIUS_METERS) {
    return jsonError(
      `${RANDOM_POINT_CLAIM_RADIUS_METERS}m 안으로 가까이 가면 획득할 수 있어요. (현재 ${Math.round(distance)}m)`
    );
  }

  const now = new Date().toISOString();

  const { data: claimed, error: claimError } = await admin
    .from("random_points")
    .update({
      status: "claimed",
      claimed_by: user.id,
      claimed_at: now,
    })
    .eq("id", random_point_id)
    .eq("status", "active")
    .select();

  if (claimError || !claimed || claimed.length === 0) {
    return jsonError("이미 획득했거나 만료된 포인트입니다.");
  }

  const addResult = await addPoints(
    user.id,
    randomPoint.points,
    "random_point_claim",
    "랜덤 포인트 획득",
    random_point_id
  );

  if (!addResult.success) {
    return jsonError(addResult.error!, 500);
  }

  return NextResponse.json({
    message: "포인트 획득 완료!",
    points: addResult.newPoints,
    earned: randomPoint.points,
  });
}
