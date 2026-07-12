import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPremiumCouponSpawnDistanceMeters } from "@/lib/env";
import { offsetPointMeters } from "@/lib/geo";

/** 기존 활성 스폰만 갱신·반환. 자동 생성하지 않음. */
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
  const now = new Date();
  const nowIso = now.toISOString();

  await admin
    .from("premium_coupon_spawns")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "active")
    .lt("expires_at", nowIso);

  const { data: activeSpawns } = await admin
    .from("premium_coupon_spawns")
    .select("*, premium_coupons(title, is_active), premium_places(store_name, lat, lng)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", nowIso);

  const spawnDistance = getPremiumCouponSpawnDistanceMeters();
  const spawns = [];

  for (const spawn of activeSpawns ?? []) {
    const coupon = spawn.premium_coupons as {
      title?: string;
      is_active?: boolean;
    } | null;

    if (!coupon?.is_active) {
      await admin
        .from("premium_coupon_spawns")
        .update({ status: "expired" })
        .eq("id", spawn.id);
      continue;
    }

    const place = spawn.premium_places as {
      store_name?: string;
      lat?: number;
      lng?: number;
    } | null;

    const offset =
      place &&
      typeof place.lat === "number" &&
      typeof place.lng === "number"
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

    spawns.push({
      id: spawn.id,
      couponId: spawn.coupon_id,
      premiumPlaceId: spawn.premium_place_id,
      lat: offset.lat,
      lng: offset.lng,
      status: spawn.status,
      expiresAt: spawn.expires_at,
      couponTitle: coupon.title ?? "",
      storeName: place?.store_name ?? "",
    });
  }

  return NextResponse.json({ spawns });
}
