export const PIN_RADIUS_METERS = 100;
export const INITIAL_POINTS = 1000;
export const CREATE_PIN_COST = 100;
export const PIN_DURATION_HOURS = 24;
export const CONQUER_BASE_COST = 100;
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
export const SERVICE_NAME = "발도장";

export const DAILY_BONUS_AMOUNT = 10;
export const DAILY_BONUS_RESET_HOUR_KST = 9;
