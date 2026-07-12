import { NextResponse } from "next/server";
import {
  getPremiumCouponClaimRadiusMeters,
  getPremiumCouponSpawnDistanceMeters,
  getPremiumPlaceRadiusMeters,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePremiumPlace } from "@/lib/premium/serialize";

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("premium_places")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "프리미엄 장소 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const places = data ?? [];
  const placeIds = places.map((p) => p.id);

  const couponPlaceIds = new Set<string>();
  if (placeIds.length > 0) {
    const { data: coupons } = await admin
      .from("premium_coupons")
      .select("premium_place_id")
      .in("premium_place_id", placeIds);

    for (const row of coupons ?? []) {
      couponPlaceIds.add(row.premium_place_id);
    }
  }

  const { data: codes } = await admin
    .from("common_codes")
    .select("code, name")
    .eq("group_code", "PREMIUM_CATEGORY")
    .eq("is_active", true);

  const codeMap = new Map((codes ?? []).map((c) => [c.code, c.name]));

  return NextResponse.json({
    places: places.map((place) => ({
      ...serializePremiumPlace(place),
      categoryName: codeMap.get(place.category_code) ?? place.category_code,
      hasCoupons: couponPlaceIds.has(place.id),
    })),
    radiusMeters: getPremiumPlaceRadiusMeters(),
  });
}

export async function HEAD() {
  return NextResponse.json({
    radiusMeters: getPremiumPlaceRadiusMeters(),
    couponSpawnDistanceMeters: getPremiumCouponSpawnDistanceMeters(),
    couponClaimRadiusMeters: getPremiumCouponClaimRadiusMeters(),
  });
}
