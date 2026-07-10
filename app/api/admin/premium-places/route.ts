import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePremiumPlace } from "@/lib/premium/serialize";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category");
  const active = searchParams.get("active");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("premium_places")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike("store_name", `%${q}%`);
  }
  if (category) {
    query = query.eq("category_code", category);
  }
  if (active === "true") {
    query = query.eq("is_active", true);
  } else if (active === "false") {
    query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: "프리미엄 장소 조회에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    places: (data ?? []).map(serializePremiumPlace),
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    categoryCode,
    storeName,
    contactPhone,
    contactEmail,
    contactName,
    lat,
    lng,
    benefit,
    promoText,
    promoLink,
    isActive,
    promotionRequestId,
  } = body;

  if (!categoryCode || !storeName || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: place, error } = await admin
    .from("premium_places")
    .insert({
      category_code: categoryCode,
      store_name: storeName,
      contact_phone: contactPhone ?? null,
      contact_email: contactEmail ?? null,
      contact_name: contactName ?? null,
      lat,
      lng,
      benefit: benefit ?? "",
      promo_text: promoText ?? "",
      promo_link: promoLink ?? null,
      is_active: isActive === true,
      promotion_request_id: promotionRequestId ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !place) {
    return NextResponse.json({ error: "프리미엄 장소 등록에 실패했습니다." }, { status: 500 });
  }

  if (promotionRequestId) {
    await admin
      .from("premium_promotion_requests")
      .update({
        status: "completed",
        premium_place_id: place.id,
        processed_at: now,
        updated_at: now,
      })
      .eq("id", promotionRequestId);
  }

  return NextResponse.json({ place: serializePremiumPlace(place) });
}
