import { createAdminClient } from "@/lib/supabase/admin";

export const PREMIUM_PLACE_EVENT_TYPES = [
  "marker_click",
  "detail_open",
  "phone_click",
  "link_click",
  "coupon_issue",
  "coupon_spawn_click",
  "coupon_claim",
  "coupon_use",
  "view_from_coupons",
] as const;

export type PremiumPlaceEventType = (typeof PREMIUM_PLACE_EVENT_TYPES)[number];

export const CLIENT_PREMIUM_PLACE_EVENT_TYPES = [
  "marker_click",
  "detail_open",
  "phone_click",
  "link_click",
  "coupon_spawn_click",
  "view_from_coupons",
] as const;

export type ClientPremiumPlaceEventType =
  (typeof CLIENT_PREMIUM_PLACE_EVENT_TYPES)[number];

export const PREMIUM_PLACE_EVENT_LABELS: Record<PremiumPlaceEventType, string> =
  {
    marker_click: "마커 클릭",
    detail_open: "상세 오픈",
    phone_click: "전화 클릭",
    link_click: "링크 클릭",
    coupon_issue: "쿠폰 발행",
    coupon_spawn_click: "쿠폰 스폰 클릭",
    coupon_claim: "쿠폰 획득",
    coupon_use: "쿠폰 사용",
    view_from_coupons: "쿠폰함에서 보기",
  };

export function isPremiumPlaceEventType(
  value: string
): value is PremiumPlaceEventType {
  return (PREMIUM_PLACE_EVENT_TYPES as readonly string[]).includes(value);
}

export function isClientPremiumPlaceEventType(
  value: string
): value is ClientPremiumPlaceEventType {
  return (CLIENT_PREMIUM_PLACE_EVENT_TYPES as readonly string[]).includes(value);
}

export async function recordPremiumPlaceEvent(params: {
  premiumPlaceId: string;
  eventType: PremiumPlaceEventType;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("premium_place_events").insert({
    premium_place_id: params.premiumPlaceId,
    event_type: params.eventType,
    user_id: params.userId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("premium_place_event insert failed:", error.message);
  }
}
