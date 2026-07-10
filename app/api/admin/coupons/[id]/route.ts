import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePremiumCoupon } from "@/lib/premium/serialize";
import { validateCouponInput } from "@/lib/validation/premium";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const validation = validateCouponInput(body);
  if (!validation.valid) {
    return jsonError(validation.error);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("premium_coupons")
    .update({
      title: validation.data.title,
      description: validation.data.description,
      benefit: validation.data.benefit,
      is_active: validation.data.isActive,
      expires_at: validation.data.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("쿠폰 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({ coupon: serializePremiumCoupon(data) });
}
