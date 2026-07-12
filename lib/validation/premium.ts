const URL_PATTERN = /^https?:\/\/.+/i;

export interface PromotionRequestInput {
  categoryCode: string;
  storeName: string;
  contactPhone: string;
  contactEmail: string | null;
  contactName: string | null;
  address: string;
  placePhone: string | null;
  lat: number | null;
  lng: number | null;
  promoText: string;
  promoLink?: string | null;
}

export function validatePromotionRequestInput(
  body: Partial<PromotionRequestInput>
): { valid: true; data: PromotionRequestInput } | { valid: false; error: string } {
  const {
    categoryCode,
    storeName,
    contactPhone,
    contactEmail,
    contactName,
    address,
    placePhone,
    lat,
    lng,
    promoText,
    promoLink,
  } = body;

  if (!categoryCode?.trim()) return { valid: false, error: "카테고리를 선택해주세요." };
  if (!storeName?.trim() || storeName.trim().length > 50) {
    return { valid: false, error: "장소명을 50자 이내로 입력해주세요." };
  }
  if (!contactPhone?.trim()) return { valid: false, error: "담당자 연락처를 입력해주세요." };
  if (!address?.trim() || address.trim().length > 200) {
    return { valid: false, error: "도로명 주소를 200자 이내로 입력해주세요." };
  }
  const trimmedPlacePhone = placePhone?.trim() || "";
  if (trimmedPlacePhone.length > 30) {
    return { valid: false, error: "장소 전화번호는 30자 이내로 입력해주세요." };
  }
  if (!promoText?.trim() || promoText.trim().length > 500) {
    return { valid: false, error: "홍보 문구를 500자 이내로 입력해주세요." };
  }

  const trimmedEmail = contactEmail?.trim() || "";
  if (trimmedEmail && !trimmedEmail.includes("@")) {
    return { valid: false, error: "이메일을 올바르게 입력해주세요." };
  }

  const trimmedName = contactName?.trim() || "";
  if (trimmedName.length > 50) {
    return { valid: false, error: "담당자 이름은 50자 이내로 입력해주세요." };
  }

  const hasLat = typeof lat === "number" && Number.isFinite(lat);
  const hasLng = typeof lng === "number" && Number.isFinite(lng);
  if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
    return { valid: false, error: "지도 위치가 올바르지 않습니다." };
  }

  if (promoLink && promoLink.trim() && !URL_PATTERN.test(promoLink.trim())) {
    return { valid: false, error: "홍보 링크는 http(s) URL이어야 합니다." };
  }

  return {
    valid: true,
    data: {
      categoryCode: categoryCode.trim(),
      storeName: storeName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: trimmedEmail || null,
      contactName: trimmedName || null,
      address: address.trim(),
      placePhone: trimmedPlacePhone || null,
      lat: hasLat ? (lat as number) : null,
      lng: hasLng ? (lng as number) : null,
      promoText: promoText.trim(),
      promoLink: promoLink?.trim() || null,
    },
  };
}

export function validatePremiumPlaceInput(
  body: Partial<
    PromotionRequestInput & {
      isActive?: boolean;
      promotionRequestId?: string | null;
    }
  >
):
  | {
      valid: true;
      data: PromotionRequestInput & {
        lat: number;
        lng: number;
        isActive: boolean;
        promotionRequestId: string | null;
      };
    }
  | { valid: false; error: string } {
  const base = validatePromotionRequestInput(body);
  if (!base.valid) return base;

  if (typeof base.data.lat !== "number" || typeof base.data.lng !== "number") {
    return { valid: false, error: "지도에서 장소 위치를 선택해주세요." };
  }

  return {
    valid: true,
    data: {
      ...base.data,
      lat: base.data.lat,
      lng: base.data.lng,
      isActive: body.isActive === true,
      promotionRequestId: body.promotionRequestId ?? null,
    },
  };
}

export function validateCouponInput(body: {
  title?: string;
  description?: string;
  benefit?: string;
  isActive?: boolean;
  expiresAt?: string | null;
  issueLimit?: number;
}):
  | {
      valid: true;
      data: {
        title: string;
        description: string;
        benefit: string;
        isActive: boolean;
        expiresAt: string | null;
        issueLimit: number;
      };
    }
  | { valid: false; error: string } {
  if (!body.title?.trim()) return { valid: false, error: "쿠폰 제목을 입력해주세요." };
  if (!body.description?.trim()) {
    return { valid: false, error: "쿠폰 설명을 입력해주세요." };
  }
  if (!body.benefit?.trim()) return { valid: false, error: "쿠폰 혜택을 입력해주세요." };

  const issueLimit = Number(body.issueLimit);
  if (!Number.isInteger(issueLimit) || issueLimit < 0) {
    return { valid: false, error: "발행 개수는 0 이상의 정수로 입력해주세요." };
  }

  let expiresAt: string | null = null;
  if (body.expiresAt != null && String(body.expiresAt).trim()) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, error: "만료일이 올바르지 않습니다." };
    }
    expiresAt = parsed.toISOString();
  }

  return {
    valid: true,
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      benefit: body.benefit.trim(),
      isActive: body.isActive !== false,
      expiresAt,
      issueLimit,
    },
  };
}

export function toTelHref(phone: string): string {
  const normalized = phone.replace(/[^0-9+]/g, "");
  return `tel:${normalized}`;
}
