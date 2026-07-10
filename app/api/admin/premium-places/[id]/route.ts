import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  serializePremiumCoupon,
  serializePremiumPlace,
} from "@/lib/premium/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: place, error } = await admin
    .from("premium_places")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !place) {
    return jsonError("프리미엄 장소를 찾을 수 없습니다.", 404);
  }

  const { data: coupons } = await admin
    .from("premium_coupons")
    .select("*")
    .eq("premium_place_id", id)
    .order("created_at", { ascending: false });

  let linkedRequest = null;
  if (place.promotion_request_id) {
    const { data } = await admin
      .from("premium_promotion_requests")
      .select("id, store_name, status, created_at")
      .eq("id", place.promotion_request_id)
      .maybeSingle();
    linkedRequest = data;
  }

  return NextResponse.json({
    place: serializePremiumPlace(place),
    coupons: (coupons ?? []).map(serializePremiumCoupon),
    linkedRequest,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  const fields = [
    ["categoryCode", "category_code"],
    ["storeName", "store_name"],
    ["contactPhone", "contact_phone"],
    ["contactEmail", "contact_email"],
    ["contactName", "contact_name"],
    ["lat", "lat"],
    ["lng", "lng"],
    ["benefit", "benefit"],
    ["promoText", "promo_text"],
    ["promoLink", "promo_link"],
    ["isActive", "is_active"],
    ["promotionRequestId", "promotion_request_id"],
  ] as const;

  for (const [jsKey, dbKey] of fields) {
    if (body[jsKey] !== undefined) {
      updates[dbKey] = body[jsKey];
    }
  }

  const { data, error } = await admin
    .from("premium_places")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("프리미엄 장소 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({ place: serializePremiumPlace(data) });
}
