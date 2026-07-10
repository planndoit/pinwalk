import { NextResponse } from "next/server";
import {
  getPremiumCouponClaimRadiusMeters,
  getPremiumCouponSpawnDistanceMeters,
  getPremiumPlaceRadiusMeters,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePremiumPlace } from "@/lib/premium/serialize";
import { findActivePremiumPlacesNear } from "@/lib/premium/places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");

  const admin = createAdminClient();

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const places = await findActivePremiumPlacesNear(lat, lng);
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
      })),
      radiusMeters: getPremiumPlaceRadiusMeters(),
    });
  }

  const { data, error } = await admin
    .from("premium_places")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "프리미엄 장소 조회에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    places: (data ?? []).map(serializePremiumPlace),
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
