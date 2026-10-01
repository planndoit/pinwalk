import { getLatestDailyResetUtc } from "@/lib/dailyBonus";
import type {
  MissionGroup,
  MissionPeriod,
  SerializedMission,
} from "@/types/mission";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MissionDefinition {
  id: string;
  period: MissionPeriod;
  group: MissionGroup;
  title: string;
  description: string | null;
  target: number;
  unit: SerializedMission["unit"];
  reward: number;
}

export const MISSION_DEFINITIONS = [
  {
    id: "daily_find_point",
    period: "daily",
    group: "default",
    title: "포인트 찾기",
    description: null,
    target: 1,
    unit: "회",
    reward: 10,
  },
  {
    id: "daily_claim_point",
    period: "daily",
    group: "default",
    title: "포인트 획득",
    description: null,
    target: 1,
    unit: "개",
    reward: 10,
  },
  {
    id: "daily_flag_action",
    period: "daily",
    group: "default",
    title: "깃발 꽂기·강화·점령",
    description: "셋 중 하나만 해도 완료",
    target: 1,
    unit: "회",
    reward: 20,
  },
  {
    id: "weekly_claim_point",
    period: "weekly",
    group: "default",
    title: "포인트 획득",
    description: null,
    target: 10,
    unit: "개",
    reward: 40,
  },
  {
    id: "weekly_acquire_pin",
    period: "weekly",
    group: "default",
    title: "새 깃발 확보",
    description: "직접 꽂거나 점령에 성공",
    target: 1,
    unit: "개",
    reward: 40,
  },
  {
    id: "weekly_reinforce",
    period: "weekly",
    group: "default",
    title: "깃발 강화",
    description: null,
    target: 2,
    unit: "회",
    reward: 50,
  },
  {
    id: "weekly_conquer_attempt",
    period: "weekly",
    group: "default",
    title: "점령 도전",
    description: null,
    target: 1,
    unit: "회",
    reward: 30,
  },
  {
    id: "weekly_attendance",
    period: "weekly",
    group: "default",
    title: "출석",
    description: null,
    target: 5,
    unit: "일",
    reward: 40,
  },
  {
    id: "monthly_claim_point",
    period: "monthly",
    group: "core",
    title: "포인트 획득",
    description: null,
    target: 40,
    unit: "개",
    reward: 150,
  },
  {
    id: "monthly_acquire_pin",
    period: "monthly",
    group: "core",
    title: "새 깃발 확보",
    description: "직접 꽂거나 점령에 성공",
    target: 5,
    unit: "개",
    reward: 200,
  },
  {
    id: "monthly_reinforce",
    period: "monthly",
    group: "core",
    title: "깃발 강화",
    description: null,
    target: 8,
    unit: "회",
    reward: 250,
  },
  {
    id: "monthly_attendance",
    period: "monthly",
    group: "core",
    title: "출석",
    description: null,
    target: 20,
    unit: "일",
    reward: 150,
  },
  {
    id: "monthly_core_clear",
    period: "monthly",
    group: "core",
    title: "월간 핵심 미션 완료",
    description: null,
    target: 4,
    unit: "개",
    reward: 250,
  },
  {
    id: "monthly_conquer",
    period: "monthly",
    group: "challenge",
    title: "점령 성공",
    description: null,
    target: 3,
    unit: "회",
    reward: 250,
  },
  {
    id: "monthly_regions",
    period: "monthly",
    group: "challenge",
    title: "여러 지역에 깃발 꽂기",
    description: "서로 다른 시·군·구 기준",
    target: 3,
    unit: "곳",
    reward: 200,
  },
  {
    id: "start_avatar",
    period: "starter",
    group: "default",
    title: "프로필 이미지 추가",
    description: null,
    target: 1,
    unit: "회",
    reward: 20,
  },
  {
    id: "start_plant",
    period: "starter",
    group: "default",
    title: "깃발 꽂기",
    description: null,
    target: 1,
    unit: "회",
    reward: 20,
  },
  {
    id: "start_reinforce",
    period: "starter",
    group: "default",
    title: "깃발 강화",
    description: null,
    target: 1,
    unit: "회",
    reward: 20,
  },
  {
    id: "start_find",
    period: "starter",
    group: "default",
    title: "포인트 찾기",
    description: null,
    target: 1,
    unit: "회",
    reward: 10,
  },
  {
    id: "start_claim",
    period: "starter",
    group: "default",
    title: "포인트 획득",
    description: null,
    target: 1,
    unit: "회",
    reward: 10,
  },
  {
    id: "start_crew",
    period: "starter",
    group: "default",
    title: "크루 들어가기",
    description: null,
    target: 1,
    unit: "회",
    reward: 30,
  },
  {
    id: "start_conquer",
    period: "starter",
    group: "default",
    title: "점령 도전",
    description: null,
    target: 1,
    unit: "회",
    reward: 30,
  },
] as const satisfies readonly MissionDefinition[];

export type MissionId = (typeof MISSION_DEFINITIONS)[number]["id"];

export const MONTHLY_CORE_MISSION_IDS: MissionId[] = [
  "monthly_claim_point",
  "monthly_acquire_pin",
  "monthly_reinforce",
  "monthly_attendance",
];

export function getMissionDefinition(
  missionId: string
): (typeof MISSION_DEFINITIONS)[number] | null {
  return (
    MISSION_DEFINITIONS.find((definition) => definition.id === missionId) ??
    null
  );
}

export interface MissionPeriodRange {
  key: string;
  start: Date | null;
  end: Date | null;
}

export function getMissionPeriodRange(
  period: MissionPeriod,
  now: Date = new Date()
): MissionPeriodRange {
  if (period === "starter") {
    return { key: "once", start: null, end: null };
  }

  const dailyStart = getLatestDailyResetUtc(now);

  if (period === "daily") {
    return {
      key: dailyStart.toISOString(),
      start: dailyStart,
      end: new Date(dailyStart.getTime() + DAY_MS),
    };
  }

  if (period === "weekly") {
    const daysSinceMonday = (dailyStart.getUTCDay() + 6) % 7;
    const start = new Date(dailyStart.getTime() - daysSinceMonday * DAY_MS);
    return {
      key: start.toISOString(),
      start,
      end: new Date(start.getTime() + 7 * DAY_MS),
    };
  }

  const start = new Date(
    Date.UTC(dailyStart.getUTCFullYear(), dailyStart.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(dailyStart.getUTCFullYear(), dailyStart.getUTCMonth() + 1, 1)
  );
  return { key: start.toISOString(), start, end };
}
