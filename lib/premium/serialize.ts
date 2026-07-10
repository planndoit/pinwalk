import type {
  CommonCode,
  PremiumCoupon,
  PremiumPlace,
  PremiumPromotionRequest,
  UserCoupon,
} from "@/types/premium";

export function serializePremiumPlace(row: PremiumPlace) {
  return {
    id: row.id,
    categoryCode: row.category_code,
    storeName: row.store_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    benefit: row.benefit,
    promoText: row.promo_text,
    promoLink: row.promo_link,
    isActive: row.is_active,
    promotionRequestId: row.promotion_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializePromotionRequest(
  row: PremiumPromotionRequest & {
    requester_nickname?: string | null;
    category_name?: string | null;
  }
) {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    requesterNickname: row.requester_nickname ?? null,
    categoryCode: row.category_code,
    categoryName: row.category_name ?? null,
    storeName: row.store_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    benefit: row.benefit,
    promoText: row.promo_text,
    promoLink: row.promo_link,
    status: row.status,
    adminNote: row.admin_note,
    premiumPlaceId: row.premium_place_id,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializePremiumCoupon(row: PremiumCoupon) {
  return {
    id: row.id,
    premiumPlaceId: row.premium_place_id,
    title: row.title,
    description: row.description,
    benefit: row.benefit,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeUserCoupon(
  row: UserCoupon & {
    coupon_title?: string;
    coupon_description?: string;
    coupon_benefit?: string;
    store_name?: string;
    category_code?: string;
  }
) {
  return {
    id: row.id,
    couponId: row.coupon_id,
    premiumPlaceId: row.premium_place_id,
    status: row.status,
    claimedAt: row.claimed_at,
    usedAt: row.used_at,
    title: row.coupon_title ?? row.coupon?.title ?? "",
    description: row.coupon_description ?? row.coupon?.description ?? "",
    benefit: row.coupon_benefit ?? row.coupon?.benefit ?? "",
    storeName: row.store_name ?? row.place?.store_name ?? "",
    categoryCode: row.category_code ?? row.place?.category_code ?? "",
  };
}

export function serializeCommonCode(row: CommonCode) {
  return {
    id: row.id,
    groupCode: row.group_code,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}
