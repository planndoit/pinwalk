import { DAILY_BONUS_RESET_HOUR_KST } from "./constants";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DAILY_BONUS_TYPE = "daily_bonus";
export const DAILY_BONUS_DESCRIPTION = "매일 출석 보너스";

export function isAttendanceTransaction(tx: {
  type?: string | null;
  description?: string | null;
  title?: string | null;
}): boolean {
  if (tx.type === DAILY_BONUS_TYPE) return true;
  if (tx.title === "출석 보너스") return true;
  if (tx.description === DAILY_BONUS_DESCRIPTION) return true;
  if (typeof tx.description === "string" && tx.description.includes("출석")) {
    return true;
  }
  return false;
}

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

export function getAttendancePeriodKey(at: Date = new Date()): string {
  return getLatestDailyResetUtc(at).toISOString();
}

/** 출석 시각 목록으로 현재 연속 출석 일수를 계산한다. */
export function computeAttendanceStreak(
  attendanceAts: Array<string | Date>,
  now: Date = new Date()
): number {
  const periods = new Set(
    attendanceAts.map((at) =>
      getAttendancePeriodKey(at instanceof Date ? at : new Date(at))
    )
  );
  if (periods.size === 0) return 0;

  let cursor = getLatestDailyResetUtc(now);
  if (!periods.has(cursor.toISOString())) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  let streak = 0;
  while (periods.has(cursor.toISOString())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
