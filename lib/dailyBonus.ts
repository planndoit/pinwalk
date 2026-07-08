import { DAILY_BONUS_RESET_HOUR_KST } from "./constants";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 가장 최근에 지나간 KST 오전 9시 경계를 UTC 시각으로 반환한다.
export function getLatestDailyResetUtc(now: Date = new Date()): Date {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  const date = kstNow.getUTCDate();
  const hour = kstNow.getUTCHours();

  let resetWallMs = Date.UTC(
    year,
    month,
    date,
    DAILY_BONUS_RESET_HOUR_KST,
    0,
    0,
    0
  );

  if (hour < DAILY_BONUS_RESET_HOUR_KST) {
    resetWallMs -= DAY_MS;
  }

  return new Date(resetWallMs - KST_OFFSET_MS);
}
