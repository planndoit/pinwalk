import type {
  NotificationCategory,
  NotificationPreferences,
} from "@/types/notification";

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "crew",
  "game",
  "support",
  "promotion",
  "points",
  "reminder",
];

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  { label: string; description: string }
> = {
  crew: {
    label: "크루",
    description: "가입 신청, 승인·거절, 추방, 해산, 리더 위임",
  },
  game: {
    label: "게임",
    description: "내 핀 점령, 방어 성공, 통행료",
  },
  support: {
    label: "문의·지원",
    description: "문의 답변",
  },
  promotion: {
    label: "프로모션·쿠폰",
    description: "홍보 요청 처리, 쿠폰 만료",
  },
  points: {
    label: "포인트",
    description: "관리자 지급, 보너스",
  },
  reminder: {
    label: "리마인더",
    description: "출석, 랜덤 포인트 등",
  },
};

const PREFERENCE_KEY: Record<
  NotificationCategory,
  keyof NotificationPreferences
> = {
  crew: "crewEnabled",
  game: "gameEnabled",
  support: "supportEnabled",
  promotion: "promotionEnabled",
  points: "pointsEnabled",
  reminder: "reminderEnabled",
};

export function isCategoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory
): boolean {
  return preferences[PREFERENCE_KEY[category]];
}
