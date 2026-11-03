export const COUPANG_PARTNERS_DISCLAIMER =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로,\n이에 따른 일정액의 수수료를 제공받습니다.";

export type CoupangPartnersPlacement = "mission_bottom" | "mission_claim";

export type CoupangPartnersBannerConfig = {
  src: string;
  /** 쿠팡 위젯 원본 가로(px). iframe URL에도 동일 값을 씀. */
  width: number;
  /** 쿠팡 위젯 원본 세로(px). iframe URL에도 동일 값을 씀. */
  height: number;
};

/**
 * 미션 목록 하단: 가로로 넓고 높이는 낮게.
 * 앱 본문(max-w-lg + px-4)은 폰에서 대략 288~480px이므로
 * 위젯도 모바일 폭에 가깝게 만들어 축소로 인한 글자 깨짐을 줄인다.
 */
const MISSION_BOTTOM_DEFAULTS = {
  width: 360,
  height: 100,
  template: "carousel",
} as const;

/**
 * 보상 팝업: 상품 2개 정도가 보이도록 가로·세로를 확보.
 * 팝업 안쪽 가용 폭도 폰 기준 ~300~480px대라 동일 계열 폭을 쓴다.
 */
const MISSION_CLAIM_DEFAULTS = {
  width: 360,
  height: 250,
  template: "carousel",
} as const;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildWidgetSrc(params: {
  widgetId: string;
  trackingCode: string;
  width: number;
  height: number;
  template: string;
  subId: string;
}): string {
  const search = new URLSearchParams({
    id: params.widgetId,
    template: params.template,
    trackingCode: params.trackingCode,
    subId: params.subId,
    width: String(params.width),
    height: String(params.height),
  });
  return `https://ads-partners.coupang.com/widgets.html?${search.toString()}`;
}

export function getCoupangPartnersBannerConfig(
  placement: CoupangPartnersPlacement
): CoupangPartnersBannerConfig | null {
  const trackingCode =
    process.env.NEXT_PUBLIC_COUPANG_PARTNERS_TRACKING_CODE?.trim() || "";
  if (!trackingCode) return null;

  if (placement === "mission_claim") {
    const widgetId =
      process.env.NEXT_PUBLIC_COUPANG_PARTNERS_CLAIM_WIDGET_ID?.trim() || "";
    if (!widgetId) return null;

    const width = readPositiveInt(
      process.env.NEXT_PUBLIC_COUPANG_PARTNERS_CLAIM_WIDTH,
      MISSION_CLAIM_DEFAULTS.width
    );
    const height = readPositiveInt(
      process.env.NEXT_PUBLIC_COUPANG_PARTNERS_CLAIM_HEIGHT,
      MISSION_CLAIM_DEFAULTS.height
    );
    const template =
      process.env.NEXT_PUBLIC_COUPANG_PARTNERS_CLAIM_TEMPLATE?.trim() ||
      MISSION_CLAIM_DEFAULTS.template;

    return {
      src: buildWidgetSrc({
        widgetId,
        trackingCode,
        width,
        height,
        template,
        subId: placement,
      }),
      width,
      height,
    };
  }

  const widgetId =
    process.env.NEXT_PUBLIC_COUPANG_PARTNERS_MISSION_WIDGET_ID?.trim() || "";
  if (!widgetId) return null;

  const width = readPositiveInt(
    process.env.NEXT_PUBLIC_COUPANG_PARTNERS_MISSION_WIDTH,
    MISSION_BOTTOM_DEFAULTS.width
  );
  const height = readPositiveInt(
    process.env.NEXT_PUBLIC_COUPANG_PARTNERS_MISSION_HEIGHT,
    MISSION_BOTTOM_DEFAULTS.height
  );
  const template =
    process.env.NEXT_PUBLIC_COUPANG_PARTNERS_MISSION_TEMPLATE?.trim() ||
    MISSION_BOTTOM_DEFAULTS.template;

  return {
    src: buildWidgetSrc({
      widgetId,
      trackingCode,
      width,
      height,
      template,
      subId: placement,
    }),
    width,
    height,
  };
}
