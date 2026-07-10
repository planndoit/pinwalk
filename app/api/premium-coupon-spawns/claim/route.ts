import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPremiumCouponClaimRadiusMeters } from "@/lib/env";
import { getDistanceMeters } from "@/lib/geo";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { spawn_id, current_lat, current_lng } = body as {
    spawn_id?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (!spawn_id) {
    return jsonError("쿠폰 ID가 필요합니다.");
  }
  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const { data: spawn, error } = await admin
    .from("premium_coupon_spawns")
    .select("*")
    .eq("id", spawn_id)
    .eq("user_id", user.id)
    .single();

  if (error || !spawn) {
    return jsonError("쿠폰을 찾을 수 없습니다.", 404);
  }

  if (spawn.status !== "active") {
    return jsonError("이미 획득했거나 만료된 쿠폰입니다.");
  }

  if (new Date(spawn.expires_at) <= new Date()) {
    await admin
      .from("premium_coupon_spawns")
      .update({ status: "expired" })
      .eq("id", spawn_id);
    return jsonError("만료된 쿠폰입니다.");
  }

  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    spawn.lat,
    spawn.lng
  );
  const claimRadius = getPremiumCouponClaimRadiusMeters();
  if (distance > claimRadius) {
    return jsonError(
      `${claimRadius}m 안으로 가까이 가면 획득할 수 있어요. (현재 ${Math.round(distance)}m)`
    );
  }

  const { data: coupon } = await admin
    .from("premium_coupons")
    .select("*")
    .eq("id", spawn.coupon_id)
    .single();

  if (!coupon || !coupon.is_active) {
    return jsonError("유효하지 않은 쿠폰입니다.");
  }

  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return jsonError("만료된 쿠폰입니다.");
  }

  const { data: existing } = await admin
    .from("user_coupons")
    .select("id")
    .eq("user_id", user.id)
    .eq("coupon_id", spawn.coupon_id)
    .maybeSingle();

  if (existing) {
    return jsonError("이미 획득한 쿠폰입니다.");
  }

  const now = new Date().toISOString();

  const { data: claimedSpawn, error: claimSpawnError } = await admin
    .from("premium_coupon_spawns")
    .update({ status: "claimed" })
    .eq("id", spawn_id)
    .eq("status", "active")
    .select();

  if (claimSpawnError || !claimedSpawn?.length) {
    return jsonError("쿠폰 획득에 실패했습니다.");
  }

  const { error: insertError } = await admin.from("user_coupons").insert({
    user_id: user.id,
    coupon_id: spawn.coupon_id,
    premium_place_id: spawn.premium_place_id,
    status: "available",
    claimed_at: now,
  });

  if (insertError) {
    return jsonError("쿠폰함 저장에 실패했습니다.", 500);
  }

  return NextResponse.json({
    message: "프리미엄 쿠폰을 획득했습니다!",
  });
}
