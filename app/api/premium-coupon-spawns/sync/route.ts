import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPremiumCouponSpawnDistanceMeters,
  getPremiumCouponSpawnExpiresMinutes,
} from "@/lib/env";
import { findActivePremiumPlacesNear } from "@/lib/premium/places";
import { offsetPointMeters } from "@/lib/geo";

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
  const nearbyPlaces = await findActivePremiumPlacesNear(current_lat, current_lng);
  if (nearbyPlaces.length === 0) {
    return NextResponse.json({ spawns: [], inPremiumZone: false });
  }

  const placeIds = nearbyPlaces.map((p) => p.id);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + getPremiumCouponSpawnExpiresMinutes() * 60 * 1000
  ).toISOString();

  await admin
    .from("premium_coupon_spawns")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "active")
    .lt("expires_at", now.toISOString());

  const { data: claimedCoupons } = await admin
    .from("user_coupons")
    .select("coupon_id")
    .eq("user_id", user.id);

  const claimedSet = new Set((claimedCoupons ?? []).map((c) => c.coupon_id));

  const { data: coupons } = await admin
    .from("premium_coupons")
    .select("*")
    .in("premium_place_id", placeIds)
    .eq("is_active", true);

  const availableCoupons = (coupons ?? []).filter((coupon) => {
    if (claimedSet.has(coupon.id)) return false;
    if (coupon.expires_at && new Date(coupon.expires_at) <= now) return false;
    return true;
  });

  const { data: existingSpawns } = await admin
    .from("premium_coupon_spawns")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", now.toISOString());

  const activeSpawnCouponIds = new Set((existingSpawns ?? []).map((s) => s.coupon_id));
  const spawnDistance = getPremiumCouponSpawnDistanceMeters();
  const newSpawns = [];

  for (const coupon of availableCoupons) {
    if (activeSpawnCouponIds.has(coupon.id)) continue;

    const place = nearbyPlaces.find((p) => p.id === coupon.premium_place_id);
    if (!place) continue;

    const offset = offsetPointMeters(
      current_lat,
      current_lng,
      place.lat,
      place.lng,
      spawnDistance
    );

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
      newSpawns.push(inserted);
    }
  }

  const { data: allActiveSpawns } = await admin
    .from("premium_coupon_spawns")
    .select("*, premium_coupons(title), premium_places(store_name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", now.toISOString());

  const spawns = await Promise.all(
    (allActiveSpawns ?? []).map(async (spawn) => {
      const place = nearbyPlaces.find((p) => p.id === spawn.premium_place_id);
      const offset = place
        ? offsetPointMeters(
            current_lat,
            current_lng,
            place.lat,
            place.lng,
            spawnDistance
          )
        : { lat: spawn.lat, lng: spawn.lng };

      await admin
        .from("premium_coupon_spawns")
        .update({ lat: offset.lat, lng: offset.lng })
        .eq("id", spawn.id);

      return {
        id: spawn.id,
        couponId: spawn.coupon_id,
        premiumPlaceId: spawn.premium_place_id,
        lat: offset.lat,
        lng: offset.lng,
        status: spawn.status,
        expiresAt: spawn.expires_at,
        couponTitle:
          (spawn.premium_coupons as { title?: string } | null)?.title ?? "",
        storeName:
          (spawn.premium_places as { store_name?: string } | null)?.store_name ??
          "",
      };
    })
  );

  return NextResponse.json({
    inPremiumZone: true,
    spawns,
    nearbyPlaces: nearbyPlaces.map((p) => ({
      id: p.id,
      storeName: p.store_name,
    })),
  });
}
