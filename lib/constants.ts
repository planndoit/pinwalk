export const INITIAL_POINTS = 1000;

/** 깃발 생성 비용 (고정). */
export const PIN_CREATE_COST = 100;

/** 깃발 강화 1회 비용. */
export const PIN_REINFORCE_COST = 100;

/** 깃발 최대 투자 포인트. */
export const PIN_MAX_COST = 1000;

/** 허용 cost: 100, 200, …, 1000 */
export const PIN_COST_STEPS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
] as const;
export type PinCost = (typeof PIN_COST_STEPS)[number];
export const DEFAULT_PIN_COST: PinCost = 100;

/** @deprecated PIN_COST_STEPS 사용. 하위 호환용 별칭. */
export const PIN_COST_OPTIONS = PIN_COST_STEPS;

/** 일반 깃발 영향 반경(m). cost와 무관하게 고정. */
export const FIXED_PIN_RADIUS_METERS = 100;

/** @deprecated FIXED_PIN_RADIUS_METERS 사용. */
export const DEFAULT_PIN_RADIUS_BY_COST: Record<PinCost, number> = {
  100: FIXED_PIN_RADIUS_METERS,
  200: FIXED_PIN_RADIUS_METERS,
  300: FIXED_PIN_RADIUS_METERS,
  400: FIXED_PIN_RADIUS_METERS,
  500: FIXED_PIN_RADIUS_METERS,
  600: FIXED_PIN_RADIUS_METERS,
  700: FIXED_PIN_RADIUS_METERS,
  800: FIXED_PIN_RADIUS_METERS,
  900: FIXED_PIN_RADIUS_METERS,
  1000: FIXED_PIN_RADIUS_METERS,
};

/** 깃발 강화 쿨다운 (생성·강화 후). */
export const PIN_REINFORCE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isPinCost(value: number): value is PinCost {
  return (PIN_COST_STEPS as readonly number[]).includes(value);
}

export function normalizePinCost(value: number): PinCost {
  if (isPinCost(value)) return value;
  const stepped = Math.round(value / 100) * 100;
  if (isPinCost(stepped)) return stepped;
  if (stepped < 100) return 100;
  return 1000;
}

export function getNextPinCost(cost: number): PinCost | null {
  const current = normalizePinCost(cost);
  if (current >= PIN_MAX_COST) return null;
  return (current + PIN_REINFORCE_COST) as PinCost;
}

export const CONQUER_PROBABILITIES = [10, 25, 50, 75] as const;
export type ConquerProbability = (typeof CONQUER_PROBABILITIES)[number];

export const RANDOM_POINT_RADIUS_METERS = 500;
export const RANDOM_POINT_VALUES = [10, 20, 30, 50, 100] as const;
export const RANDOM_POINT_SPAWN_INTERVAL_MINUTES = 10;
export const RANDOM_POINT_COUNT = 3;
export const RANDOM_POINT_EXPIRES_MINUTES = 15;
export const RANDOM_POINT_CLAIM_RADIUS_METERS = 30;

/** 남의 깃발 영역에서 포인트 획득 시 주인에게 가는 통행료 비율. */
export const PIN_TOLL_RATE = 0.1;

/** 내 깃발 영역에서 포인트 획득 시 배율. */
export const OWN_TERRITORY_POINT_MULTIPLIER = 2;

/** 랜덤 포인트 튜닝은 .env.local의 RANDOM_POINT_* 로 오버라이드. */

export const PIN_TEXT_MAX_LENGTH = 20;
export const DEFAULT_NICKNAME = "익명의 워커";
export const SERVICE_NAME = "이땅내땅";

/** 프로덕션 공개 도메인 (Vercel 커스텀 도메인). */
export const PRODUCTION_SITE_URL = "https://pinwalk.kr";

export const DAILY_BONUS_AMOUNT = 10;
export const DAILY_BONUS_RESET_HOUR_KST = 9;

/** 랜드마크 기본 영향 반경(m). .env.local의 LANDMARK_RADIUS_METERS 로 오버라이드. */
export const DEFAULT_LANDMARK_RADIUS_METERS = 200;

/** 랜드마크 존 안 깃발 반경(m). */
export const LANDMARK_PIN_RADIUS_METERS = 5;

/** TourAPI 랜드마크 후보 contentTypeId (국문 KorService). */
export const TOUR_LANDMARK_CONTENT_TYPE_IDS = ["12", "14"] as const;

export const TOUR_CONTENT_TYPE_LABELS: Record<string, string> = {
  "12": "관광지",
  "14": "문화시설",
  "15": "축제/공연",
  "25": "여행코스",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식",
};

/** TourAPI areaBasedList2 용 주요 지역코드. */
export const TOUR_AREA_OPTIONS = [
  { code: "1", name: "서울" },
  { code: "2", name: "인천" },
  { code: "3", name: "대전" },
  { code: "4", name: "대구" },
  { code: "5", name: "광주" },
  { code: "6", name: "부산" },
  { code: "7", name: "울산" },
  { code: "8", name: "세종" },
  { code: "31", name: "경기" },
  { code: "32", name: "강원" },
  { code: "33", name: "충북" },
  { code: "34", name: "충남" },
  { code: "35", name: "전북" },
  { code: "36", name: "전남" },
  { code: "37", name: "경북" },
  { code: "38", name: "경남" },
  { code: "39", name: "제주" },
] as const;

export const LANDMARK_SOURCE_ATTRIBUTION = "한국관광공사";

/** 크루 생성 비용 (P). */
export const CREW_CREATE_COST = 1000;

export const CREW_NAME_MAX_LENGTH = 10;
export const CREW_DESCRIPTION_MAX_LENGTH = 200;
export const CREW_MEMBERS_MIN = 2;
export const CREW_MEMBERS_MAX = 20;

/** 활동지역: 전국. */
export const CREW_AREA_NATIONWIDE = "all" as const;

export const CREW_AREA_OPTIONS = [
  { code: CREW_AREA_NATIONWIDE, name: "전국" },
  ...TOUR_AREA_OPTIONS,
] as const;

export type CrewAreaCode = (typeof CREW_AREA_OPTIONS)[number]["code"];

export function isCrewAreaCode(value: string): value is CrewAreaCode {
  return CREW_AREA_OPTIONS.some((option) => option.code === value);
}

export function getCrewAreaLabel(areaCode: string): string {
  return (
    CREW_AREA_OPTIONS.find((option) => option.code === areaCode)?.name ??
    areaCode
  );
}

export const INQUIRY_TITLE_MAX_LENGTH = 40;
export const INQUIRY_CONTENT_MAX_LENGTH = 2000;
export const INQUIRY_REPLY_MAX_LENGTH = 2000;

export const INQUIRY_STATUSES = ["pending", "answered", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}
