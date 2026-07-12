export const PIN_RADIUS_METERS = 100;
export const INITIAL_POINTS = 1000;

export const PIN_COST_OPTIONS = [100, 300, 500, 1000] as const;
export type PinCost = (typeof PIN_COST_OPTIONS)[number];
export const DEFAULT_PIN_COST: PinCost = 100;

export function isPinCost(value: number): value is PinCost {
  return (PIN_COST_OPTIONS as readonly number[]).includes(value);
}

export const CONQUER_BASE_COST = 100;
export const CONQUER_PROBABILITIES = [10, 25, 50, 75] as const;
export type ConquerProbability = (typeof CONQUER_PROBABILITIES)[number];

/** 깃발 투자 포인트별 점령 성공률 배율 (비용 공식은 그대로, 실제 성공만 감소) */
export const CONQUER_SUCCESS_MULTIPLIER_BY_COST: Record<PinCost, number> = {
  100: 1,
  300: 2 / 3,
  500: 0.5,
  1000: 0.25,
};

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
