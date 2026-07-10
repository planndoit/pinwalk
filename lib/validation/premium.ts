const URL_PATTERN = /^https?:\/\/.+/i;

export interface PromotionRequestInput {
  categoryCode: string;
  storeName: string;
  contactPhone: string;
  contactEmail: string;
  contactName: string;
  lat: number;
  lng: number;
  benefit: string;
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
    lat,
    lng,
    benefit,
    promoText,
    promoLink,
  } = body;

  if (!categoryCode?.trim()) return { valid: false, error: "카테고리를 선택해주세요." };
  if (!storeName?.trim() || storeName.trim().length > 50) {
    return { valid: false, error: "가게명을 50자 이내로 입력해주세요." };
  }
  if (!contactPhone?.trim()) return { valid: false, error: "연락처를 입력해주세요." };
  if (!contactEmail?.trim() || !contactEmail.includes("@")) {
    return { valid: false, error: "이메일을 올바르게 입력해주세요." };
  }
  if (!contactName?.trim()) return { valid: false, error: "담당자 이름을 입력해주세요." };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { valid: false, error: "가게 위치를 선택해주세요." };
  }
  if (!benefit?.trim() || benefit.trim().length > 200) {
    return { valid: false, error: "혜택을 200자 이내로 입력해주세요." };
  }
  if (!promoText?.trim() || promoText.trim().length > 500) {
    return { valid: false, error: "홍보 문구를 500자 이내로 입력해주세요." };
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
      contactEmail: contactEmail.trim(),
      contactName: contactName.trim(),
      lat,
      lng,
      benefit: benefit.trim(),
      promoText: promoText.trim(),
      promoLink: promoLink?.trim() || null,
    },
  };
}

export function validatePremiumPlaceInput(
  body: Partial<PromotionRequestInput & { isActive?: boolean; promotionRequestId?: string | null }>
): { valid: true; data: PromotionRequestInput & { isActive: boolean; promotionRequestId: string | null } } | { valid: false; error: string } {
  const base = validatePromotionRequestInput(body);
  if (!base.valid) return base;

  return {
    valid: true,
    data: {
      ...base.data,
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
}): { valid: true; data: { title: string; description: string; benefit: string; isActive: boolean; expiresAt: string | null } } | { valid: false; error: string } {
  if (!body.title?.trim()) return { valid: false, error: "쿠폰 제목을 입력해주세요." };
  if (!body.description?.trim()) return { valid: false, error: "쿠폰 설명을 입력해주세요." };
  if (!body.benefit?.trim()) return { valid: false, error: "쿠폰 혜택을 입력해주세요." };

  return {
    valid: true,
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      benefit: body.benefit.trim(),
      isActive: body.isActive !== false,
      expiresAt: body.expiresAt ?? null,
    },
  };
}
