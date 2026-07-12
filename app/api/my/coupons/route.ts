import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeUserCoupon } from "@/lib/premium/serialize";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_coupons")
    .select(
      "*, premium_coupons(title, description, benefit), premium_places(store_name, category_code, address, place_phone, promo_text, promo_link, lat, lng, is_active)"
    )
    .eq("user_id", user.id)
    .order("claimed_at", { ascending: false });

  if (error) {
    return jsonError("쿠폰함 조회에 실패했습니다.", 500);
  }

  const { data: codes } = await admin
    .from("common_codes")
    .select("code, name")
    .eq("group_code", "PREMIUM_CATEGORY");

  const codeMap = new Map((codes ?? []).map((c) => [c.code, c.name]));

  const coupons = (data ?? []).map((row) => {
    const place = row.premium_places as {
      store_name?: string;
      category_code?: string;
      address?: string | null;
      place_phone?: string | null;
      promo_text?: string;
      promo_link?: string | null;
      lat?: number;
      lng?: number;
      is_active?: boolean;
    } | null;

    return serializeUserCoupon({
      ...row,
      coupon_title: (row.premium_coupons as { title?: string } | null)?.title,
      coupon_description: (row.premium_coupons as { description?: string } | null)
        ?.description,
      coupon_benefit: (row.premium_coupons as { benefit?: string } | null)?.benefit,
      store_name: place?.store_name,
      category_code: place?.category_code,
      category_name: place?.category_code
        ? (codeMap.get(place.category_code) ?? place.category_code)
        : null,
      place_address: place?.address ?? null,
      place_phone: place?.place_phone ?? null,
      place_promo_text: place?.promo_text ?? null,
      place_promo_link: place?.promo_link ?? null,
      place_lat: place?.lat ?? null,
      place_lng: place?.lng ?? null,
      place_is_active: place?.is_active ?? false,
    });
  });

  return NextResponse.json({ coupons });
}
