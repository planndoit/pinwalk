import { getAttendancePeriodKey } from "@/lib/dailyBonus";
import type { HarvestSummary } from "@/types/harvest";

const HARVEST_NOTICE_KEY_PREFIX = "pinwalk:harvest-notice:";

export function isHarvestNoticeShownThisPeriod(userId: string): boolean {
  try {
    return (
      window.localStorage.getItem(HARVEST_NOTICE_KEY_PREFIX + userId) ===
      getAttendancePeriodKey()
    );
  } catch {
    return false;
  }
}

export function markHarvestNoticeShown(userId: string): void {
  try {
    window.localStorage.setItem(
      HARVEST_NOTICE_KEY_PREFIX + userId,
      getAttendancePeriodKey()
    );
  } catch {
    // ignore
  }
}

export function formatHarvestNotice(summary: HarvestSummary): string {
  const base = `내 깃발에 수확 포인트 ${summary.harvestTotal.toLocaleString("ko-KR")}P가 쌓였어요`;
  if (summary.fullPinCount > 0) {
    return `${base} · 가득 찬 깃발 ${summary.fullPinCount.toLocaleString("ko-KR")}개`;
  }
  return base;
}
