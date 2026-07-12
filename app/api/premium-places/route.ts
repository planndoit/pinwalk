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

  const { data: codes } = await admin
    .from("common_codes")
    .select("code, name")
    .eq("group_code", "PREMIUM_CATEGORY")
    .eq("is_active", true);

  const codeMap = new Map((codes ?? []).map((c) => [c.code, c.name]));

  return NextResponse.json({
    places: (data ?? []).map((place) => ({
      ...serializePremiumPlace(place),
      categoryName: codeMap.get(place.category_code) ?? place.category_code,
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
