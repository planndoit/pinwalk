import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPromotionRequestEmailHtml,
  sendAdminNotificationEmail,
} from "@/lib/email/send";
import { getCommonCodeName } from "@/lib/premium/places";
import { serializePromotionRequest } from "@/lib/premium/serialize";
import { validatePromotionRequestInput } from "@/lib/validation/premium";
import { SERVICE_NAME } from "@/lib/constants";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: Partial<{
    categoryCode: string;
    storeName: string;
    contactPhone: string;
    contactEmail: string;
    contactName: string;
    address: string;
    placePhone: string;
    lat: number;
    lng: number;
    promoText: string;
    promoLink: string;
  }>;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("요청 본문이 올바르지 않습니다.");
  }
  const validation = validatePromotionRequestInput(body);
  if (!validation.valid) {
    return jsonError(validation.error);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const data = validation.data;

  const { data: category } = await admin
    .from("common_codes")
    .select("code")
    .eq("group_code", "PREMIUM_CATEGORY")
    .eq("code", data.categoryCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!category) {
    return jsonError("유효하지 않은 카테고리입니다.");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  const { data: inserted, error } = await admin
    .from("premium_promotion_requests")
    .insert({
      requester_user_id: user.id,
      category_code: data.categoryCode,
      store_name: data.storeName,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail,
      contact_name: data.contactName,
      address: data.address,
      place_phone: data.placePhone,
      lat: data.lat,
      lng: data.lng,
      benefit: "",
      promo_text: data.promoText,
      promo_link: data.promoLink,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("premium_promotion_requests insert failed:", error);
    return jsonError("홍보 요청 저장에 실패했습니다.", 500);
  }

  const categoryName = await getCommonCodeName("PREMIUM_CATEGORY", data.categoryCode);
  const emailResult = await sendAdminNotificationEmail({
    subject: `[${SERVICE_NAME}] 프리미엄 홍보 요청: ${data.storeName}`,
    html: buildPromotionRequestEmailHtml({
      storeName: data.storeName,
      categoryName,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      placePhone: data.placePhone,
      promoText: data.promoText,
      promoLink: data.promoLink ?? null,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      requesterNickname: profile?.nickname ?? "알 수 없음",
    }),
  });

  return NextResponse.json({
    request: serializePromotionRequest({
      ...inserted,
      requester_nickname: profile?.nickname ?? null,
      category_name: categoryName,
    }),
    emailSent: emailResult.success,
    message: "프리미엄 홍보 요청이 접수되었습니다.",
  });
}
