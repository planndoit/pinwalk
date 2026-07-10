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
      "*, premium_coupons(title, description, benefit), premium_places(store_name, category_code)"
    )
    .eq("user_id", user.id)
    .order("claimed_at", { ascending: false });

  if (error) {
    return jsonError("쿠폰함 조회에 실패했습니다.", 500);
  }

  const coupons = (data ?? []).map((row) =>
    serializeUserCoupon({
      ...row,
      coupon_title: (row.premium_coupons as { title?: string } | null)?.title,
      coupon_description: (row.premium_coupons as { description?: string } | null)
        ?.description,
      coupon_benefit: (row.premium_coupons as { benefit?: string } | null)?.benefit,
      store_name: (row.premium_places as { store_name?: string } | null)?.store_name,
      category_code: (row.premium_places as { category_code?: string } | null)
        ?.category_code,
    })
  );

  return NextResponse.json({ coupons });
}
