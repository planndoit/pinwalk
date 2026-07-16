import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPremiumPlaceEvent } from "@/lib/premium/events";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: userCoupon, error } = await admin
    .from("user_coupons")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !userCoupon) {
    return jsonError("쿠폰을 찾을 수 없습니다.", 404);
  }

  if (userCoupon.status === "used") {
    return jsonError("이미 사용된 쿠폰입니다.");
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("user_coupons")
    .update({ status: "used", used_at: now })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "available")
    .select();

  if (updateError || !updated?.length) {
    return jsonError("쿠폰 사용에 실패했습니다.", 500);
  }

  await recordPremiumPlaceEvent({
    premiumPlaceId: userCoupon.premium_place_id,
    eventType: "coupon_use",
    userId: user.id,
    metadata: { couponId: userCoupon.coupon_id, userCouponId: id },
  });

  return NextResponse.json({
    message: "쿠폰을 사용했습니다. 되돌릴 수 없습니다.",
  });
}
