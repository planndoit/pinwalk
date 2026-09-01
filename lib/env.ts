import {
  DEFAULT_LANDMARK_RADIUS_METERS,
  DEFAULT_PIN_COST,
  DEFAULT_PIN_RADIUS_BY_COST,
  RANDOM_POINT_CLAIM_RADIUS_METERS,
  RANDOM_POINT_COUNT,
  RANDOM_POINT_EXPIRES_MINUTES,
  RANDOM_POINT_RADIUS_METERS,
  RANDOM_POINT_SPAWN_INTERVAL_MINUTES,
  RANDOM_POINT_VALUES,
  SERVICE_NAME,
  isPinCost,
  type PinCost,
} from "./constants";

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveIntList(
  name: string,
  fallback: readonly number[]
): number[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [...fallback];

  const parsed = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  return parsed.length > 0 ? parsed : [...fallback];
}

export function getPremiumPlaceRadiusMeters(): number {
  return readInt("PREMIUM_PLACE_RADIUS_METERS", 100);
}

export function getPinPlacementRadiusMeters(): number {
  return readInt("PIN_PLACEMENT_RADIUS_METERS", 100);
}

export function getPinRadiusByCost(): Record<PinCost, number> {
  return {
    100: readInt("PIN_RADIUS_METERS_100", DEFAULT_PIN_RADIUS_BY_COST[100]),
    300: readInt("PIN_RADIUS_METERS_300", DEFAULT_PIN_RADIUS_BY_COST[300]),
    500: readInt("PIN_RADIUS_METERS_500", DEFAULT_PIN_RADIUS_BY_COST[500]),
    1000: readInt("PIN_RADIUS_METERS_1000", DEFAULT_PIN_RADIUS_BY_COST[1000]),
  };
}

export function getPinRadiusMeters(cost: number): number {
  const byCost = getPinRadiusByCost();
  if (isPinCost(cost)) {
    return byCost[cost];
  }
  return byCost[DEFAULT_PIN_COST];
}

export function getMaxPinRadiusMeters(): number {
  return Math.max(...Object.values(getPinRadiusByCost()));
}

export function getPremiumCouponSpawnDistanceMeters(): number {
  return readInt("PREMIUM_COUPON_SPAWN_DISTANCE_METERS", 10);
}

export function getPremiumCouponClaimRadiusMeters(): number {
  return readInt("PREMIUM_COUPON_CLAIM_RADIUS_METERS", 15);
}

export function getPremiumCouponSpawnExpiresMinutes(): number {
  return readInt("PREMIUM_COUPON_SPAWN_EXPIRES_MINUTES", 30);
}

export function getAdminUsername(): string | null {
  return process.env.ADMIN_USERNAME ?? null;
}

export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD ?? null;
}

export function getAdminSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "admin-session-fallback-secret"
  );
}

export function getAdminNotificationEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? null;
}

export function getEmailFrom(): string | null {
  return process.env.EMAIL_FROM ?? null;
}

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

export function getLandmarkRadiusMeters(): number {
  return readInt("LANDMARK_RADIUS_METERS", DEFAULT_LANDMARK_RADIUS_METERS);
}

export function getRandomPointRadiusMeters(): number {
  return readInt("RANDOM_POINT_RADIUS_METERS", RANDOM_POINT_RADIUS_METERS);
}

export function getRandomPointExpiresMinutes(): number {
  return readInt("RANDOM_POINT_EXPIRES_MINUTES", RANDOM_POINT_EXPIRES_MINUTES);
}

export function getRandomPointClaimRadiusMeters(): number {
  return readInt(
    "RANDOM_POINT_CLAIM_RADIUS_METERS",
    RANDOM_POINT_CLAIM_RADIUS_METERS
  );
}

export function getRandomPointSpawnIntervalMinutes(): number {
  return readInt(
    "RANDOM_POINT_SPAWN_INTERVAL_MINUTES",
    RANDOM_POINT_SPAWN_INTERVAL_MINUTES
  );
}

export function getRandomPointCount(): number {
  return readInt("RANDOM_POINT_COUNT", RANDOM_POINT_COUNT);
}

export function getRandomPointValues(): number[] {
  return readPositiveIntList("RANDOM_POINT_VALUES", RANDOM_POINT_VALUES);
}

/** data.go.kr 발급 키. 포털에서 복사한 값을 그대로 사용(이미 인코딩된 경우 유지). */
export function getTourApiServiceKey(): string | null {
  const raw = process.env.TOUR_API_SERVICE_KEY?.trim();
  return raw || null;
}

export function getTourApiMobileApp(): string {
  return process.env.TOUR_API_MOBILE_APP?.trim() || SERVICE_NAME;
}
