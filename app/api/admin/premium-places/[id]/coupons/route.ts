import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePremiumCoupon } from "@/lib/premium/serialize";
import { validateCouponInput } from "@/lib/validation/premium";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: placeId } = await params;
  const body = await request.json();
  const validation = validateCouponInput(body);
  if (!validation.valid) {
    return jsonError(validation.error);
  }

  const admin = createAdminClient();
  const { data: place } = await admin
    .from("premium_places")
    .select("id")
    .eq("id", placeId)
    .maybeSingle();

  if (!place) {
    return jsonError("프리미엄 장소를 찾을 수 없습니다.", 404);
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("premium_coupons")
    .insert({
      premium_place_id: placeId,
      title: validation.data.title,
      description: validation.data.description,
      benefit: validation.data.benefit,
      is_active: validation.data.isActive,
      expires_at: validation.data.expiresAt,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("쿠폰 생성에 실패했습니다.", 500);
  }

  return NextResponse.json({ coupon: serializePremiumCoupon(data) });
}
