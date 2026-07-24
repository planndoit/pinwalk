export const INITIAL_POINTS = 1000;

export const PIN_COST_OPTIONS = [100, 300, 500, 1000] as const;
export type PinCost = (typeof PIN_COST_OPTIONS)[number];
export const DEFAULT_PIN_COST: PinCost = 100;

/** 투자 포인트별 영향 반경(m) 기본값. .env.local의 PIN_RADIUS_METERS_* 로 오버라이드. */
export const DEFAULT_PIN_RADIUS_BY_COST: Record<PinCost, number> = {
  100: 100,
  300: 150,
  500: 200,
  1000: 300,
};

export function isPinCost(value: number): value is PinCost {
  return (PIN_COST_OPTIONS as readonly number[]).includes(value);
}

export const CONQUER_PROBABILITIES = [10, 25, 50, 75] as const;
export type ConquerProbability = (typeof CONQUER_PROBABILITIES)[number];

export const RANDOM_POINT_RADIUS_METERS = 500;
export const RANDOM_POINT_VALUES = [10, 20, 30, 50, 100] as const;
export const RANDOM_POINT_SPAWN_INTERVAL_MINUTES = 10;
export const RANDOM_POINT_COUNT = 3;
export const RANDOM_POINT_EXPIRES_MINUTES = 15;
export const RANDOM_POINT_CLAIM_RADIUS_METERS = 30;

export const PIN_TEXT_MAX_LENGTH = 20;
export const DEFAULT_NICKNAME = "익명의 워커";
export const SERVICE_NAME = "이땅내땅";

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
