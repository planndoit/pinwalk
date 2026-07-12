export interface SerializedPremiumPlace {
  id: string;
  categoryCode: string;
  categoryName?: string;
  storeName: string;
  placePhone: string | null;
  lat: number;
  lng: number;
  promoText: string;
  promoLink: string | null;
  isActive: boolean;
}

export interface SerializedCouponSpawn {
  id: string;
  couponId: string;
  premiumPlaceId: string;
  lat: number;
  lng: number;
  status: string;
  expiresAt: string;
  couponTitle: string;
  storeName: string;
}

export interface SerializedUserCoupon {
  id: string;
  couponId: string;
  premiumPlaceId: string;
  status: "available" | "used";
  claimedAt: string;
  usedAt: string | null;
  title: string;
  description: string;
  benefit: string;
  storeName: string;
  categoryCode: string;
  categoryName: string | null;
  placeAddress: string | null;
  placePhone: string | null;
  placePromoText: string | null;
  placePromoLink: string | null;
  placeLat: number | null;
  placeLng: number | null;
  placeIsActive: boolean;
}
