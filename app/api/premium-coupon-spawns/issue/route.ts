import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPremiumCouponSpawnDistanceMeters,
  getPremiumCouponSpawnExpiresMinutes,
  getPremiumPlaceRadiusMeters,
} from "@/lib/env";
import { getDistanceMeters, offsetPointMeters } from "@/lib/geo";
import { getCouponRegistrationCounts } from "@/lib/premium/coupons";
import type { PremiumCoupon } from "@/types/premium";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { premium_place_id, current_lat, current_lng } = body as {
    premium_place_id?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (!premium_place_id) {
    return jsonError("장소 정보가 필요합니다.");
  }
  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const { data: place, error: placeError } = await admin
    .from("premium_places")
    .select("*")
    .eq("id", premium_place_id)
    .eq("is_active", true)
    .maybeSingle();

  if (placeError || !place) {
    return jsonError("프리미엄 장소를 찾을 수 없습니다.", 404);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  await admin
    .from("premium_coupon_spawns")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "active")
    .lt("expires_at", nowIso);

  const { data: coupons } = await admin
    .from("premium_coupons")
    .select("*")
    .eq("premium_place_id", premium_place_id);

  const allCoupons = (coupons ?? []) as PremiumCoupon[];
  if (allCoupons.length === 0) {
    return NextResponse.json({
      status: "none_available",
      message: "발급할 쿠폰이 없습니다.",
      spawns: [],
    });
  }

  const { data: claimedRows } = await admin
    .from("user_coupons")
    .select("coupon_id")
    .eq("user_id", user.id)
    .in(
      "coupon_id",
      allCoupons.map((c) => c.id)
    );

  const claimedSet = new Set((claimedRows ?? []).map((r) => r.coupon_id));
  if (allCoupons.every((c) => claimedSet.has(c.id))) {
    return NextResponse.json({
      status: "already_claimed_all",
      message: "이미 이 장소의 모든 쿠폰을 획득했습니다.",
      spawns: [],
    });
  }

  const placeRadius = getPremiumPlaceRadiusMeters();
  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    place.lat,
    place.lng
  );
  if (distance > placeRadius) {
    return NextResponse.json({
      status: "too_far",
      message: `프리미엄 장소 ${placeRadius}m 안에서 쿠폰을 발행해 주세요. (현재 ${Math.round(distance)}m)`,
      spawns: [],
    });
  }

  const counts = await getCouponRegistrationCounts(allCoupons.map((c) => c.id));

  const { data: existingSpawns } = await admin
    .from("premium_coupon_spawns")
    .select("*")
    .eq("user_id", user.id)
    .eq("premium_place_id", premium_place_id)
    .eq("status", "active")
    .gt("expires_at", nowIso);

  const activeSpawnCouponIds = new Set(
    (existingSpawns ?? []).map((s) => s.coupon_id)
  );

  const eligible = allCoupons.filter((coupon) => {
    if (!coupon.is_active) return false;
    if (claimedSet.has(coupon.id)) return false;
    if (coupon.expires_at && new Date(coupon.expires_at) <= now) return false;
    const registered = counts.get(coupon.id)?.registeredCount ?? 0;
    if (registered >= coupon.issue_limit) return false;
    if (activeSpawnCouponIds.has(coupon.id)) return false;
    return true;
  });

  const spawnDistance = getPremiumCouponSpawnDistanceMeters();
  const expiresAt = new Date(
    now.getTime() + getPremiumCouponSpawnExpiresMinutes() * 60 * 1000
  ).toISOString();
  const offset = offsetPointMeters(
    current_lat,
    current_lng,
    place.lat,
    place.lng,
    spawnDistance
  );

  const created = [];
  for (const coupon of eligible) {
    const { data: inserted, error } = await admin
      .from("premium_coupon_spawns")
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
        premium_place_id: place.id,
        lat: offset.lat,
        lng: offset.lng,
        status: "active",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (!error && inserted) {
      created.push({
        id: inserted.id,
        couponId: inserted.coupon_id,
        premiumPlaceId: inserted.premium_place_id,
        lat: inserted.lat,
        lng: inserted.lng,
        status: inserted.status,
        expiresAt: inserted.expires_at,
        couponTitle: coupon.title,
        storeName: place.store_name,
      });
    }
  }

  const { data: allActive } = await admin
    .from("premium_coupon_spawns")
    .select("*, premium_coupons(title), premium_places(store_name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", nowIso);

  const spawns = (allActive ?? []).map((spawn) => ({
    id: spawn.id,
    couponId: spawn.coupon_id,
    premiumPlaceId: spawn.premium_place_id,
    lat: spawn.lat,
    lng: spawn.lng,
    status: spawn.status,
    expiresAt: spawn.expires_at,
    couponTitle:
      (spawn.premium_coupons as { title?: string } | null)?.title ?? "",
    storeName:
      (spawn.premium_places as { store_name?: string } | null)?.store_name ?? "",
  }));

  if (created.length === 0) {
    if ((existingSpawns ?? []).length > 0) {
      return NextResponse.json({
        status: "already_spawned",
        message: "이미 지도에 쿠폰이 발행되어 있습니다.",
        spawns,
      });
    }
    return NextResponse.json({
      status: "none_available",
      message: "지금 발급 가능한 쿠폰이 없습니다.",
      spawns,
    });
  }

  return NextResponse.json({
    status: "spawned",
    message: `쿠폰 ${created.length}개를 지도에 발행했습니다.`,
    spawns,
  });
}
