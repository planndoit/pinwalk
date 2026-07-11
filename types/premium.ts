export type PromotionRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected";

export interface CommonCodeGroup {
  group_code: string;
  group_name: string;
  description: string | null;
  is_active: boolean;
}

export interface CommonCode {
  id: string;
  group_code: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface PremiumPromotionRequest {
  id: string;
  requester_user_id: string;
  category_code: string;
  store_name: string;
  contact_phone: string;
  contact_email: string | null;
  contact_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  benefit: string;
  promo_text: string;
  promo_link: string | null;
  status: PromotionRequestStatus;
  admin_note: string | null;
  premium_place_id: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiumPlace {
  id: string;
  category_code: string;
  store_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  benefit: string;
  promo_text: string;
  promo_link: string | null;
  is_active: boolean;
  promotion_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiumCoupon {
  id: string;
  premium_place_id: string;
  title: string;
  description: string;
  benefit: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiumCouponSpawn {
  id: string;
  user_id: string;
  coupon_id: string;
  premium_place_id: string;
  lat: number;
  lng: number;
  status: "active" | "claimed" | "expired";
  expires_at: string;
  created_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  premium_place_id: string;
  status: "available" | "used";
  claimed_at: string;
  used_at: string | null;
  coupon?: PremiumCoupon;
  place?: PremiumPlace;
}

export interface PremiumPlaceWithCoupons extends PremiumPlace {
  coupons?: PremiumCoupon[];
}

export interface PremiumCouponSpawnWithDetails extends PremiumCouponSpawn {
  coupon_title?: string;
  store_name?: string;
}
