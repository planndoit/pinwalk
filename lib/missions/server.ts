import { findSigunguByLatLng } from "@/lib/geo/koreaSigungu";
import {
  MISSION_DEFINITIONS,
  MONTHLY_CORE_MISSION_IDS,
  getMissionPeriodRange,
  type MissionId,
} from "@/lib/missions/definitions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MissionPeriod, SerializedMission } from "@/types/mission";

type TransactionRow = {
  type: string;
  related_id: string | null;
  created_at: string;
};

type AttemptRow = {
  success: boolean;
  created_at: string;
};

type RandomPointRow = {
  created_at: string;
};

export interface MissionWithPeriodKey extends SerializedMission {
  periodKey: string;
}

const PAGE_SIZE = 1000;

function isInRange(
  createdAt: string,
  range: { start: Date | null; end: Date | null }
): boolean {
  if (!range.start || !range.end) return true;
  const timestamp = new Date(createdAt).getTime();
  return timestamp >= range.start.getTime() && timestamp < range.end.getTime();
}

async function fetchTransactions(
  userId: string,
  since: string,
  until: string
): Promise<TransactionRow[]> {
  const admin = createAdminClient();
  const rows: TransactionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("point_transactions")
      .select("type, related_id, created_at")
      .eq("user_id", userId)
      .in("type", [
        "create_pin",
        "reinforce_pin",
        "random_point_claim",
        "daily_bonus",
      ])
      .gte("created_at", since)
      .lt("created_at", until)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as TransactionRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchAttempts(
  userId: string,
  since: string,
  until: string
): Promise<AttemptRow[]> {
  const admin = createAdminClient();
  const rows: AttemptRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("pin_attempts")
      .select("success, created_at")
      .eq("attacker_id", userId)
      .gte("created_at", since)
      .lt("created_at", until)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as AttemptRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function requireCount(
  result: { count: number | null; error: { message: string } | null }
): Promise<number> {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.count ?? 0;
}

export async function getUserMissions(
  userId: string,
  now: Date = new Date()
): Promise<MissionWithPeriodKey[]> {
  const admin = createAdminClient();
  const ranges: Record<MissionPeriod, ReturnType<typeof getMissionPeriodRange>> =
    {
      daily: getMissionPeriodRange("daily", now),
      weekly: getMissionPeriodRange("weekly", now),
      monthly: getMissionPeriodRange("monthly", now),
      starter: getMissionPeriodRange("starter", now),
    };

  const activityStart = [ranges.daily.start, ranges.weekly.start, ranges.monthly.start]
    .filter((value): value is Date => value !== null)
    .reduce((earliest, value) =>
      value.getTime() < earliest.getTime() ? value : earliest
    );
  const nowIso = now.toISOString();
  const periodKeys = [
    ranges.daily.key,
    ranges.weekly.key,
    ranges.monthly.key,
    ranges.starter.key,
  ];

  const [
    transactions,
    attempts,
    randomPointsResult,
    profileResult,
    startPlantResult,
    startReinforceResult,
    startClaimResult,
    startFindResult,
    startCrewResult,
    startConquerResult,
    claimsResult,
  ] = await Promise.all([
    fetchTransactions(userId, activityStart.toISOString(), nowIso),
    fetchAttempts(userId, activityStart.toISOString(), nowIso),
    admin
      .from("random_points")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", ranges.daily.start!.toISOString())
      .lt("created_at", ranges.daily.end!.toISOString()),
    admin
      .from("profiles")
      .select("avatar_mime")
      .eq("id", userId)
      .single(),
    admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "create_pin"),
    admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "reinforce_pin"),
    admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "random_point_claim"),
    admin
      .from("random_points")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("crew_members")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .eq("attacker_id", userId),
    admin
      .from("mission_claims")
      .select("mission_id, period_key")
      .eq("user_id", userId)
      .in("period_key", periodKeys),
  ]);

  if (randomPointsResult.error) {
    throw new Error(randomPointsResult.error.message);
  }
  if (claimsResult.error) {
    throw new Error(claimsResult.error.message);
  }
  if (profileResult.error || !profileResult.data) {
    throw new Error(profileResult.error?.message ?? "Profile not found");
  }

  const [
    startPlantCount,
    startReinforceCount,
    startClaimCount,
    startFindCount,
    startCrewCount,
    startConquerCount,
  ] = await Promise.all([
    requireCount(startPlantResult),
    requireCount(startReinforceResult),
    requireCount(startClaimResult),
    requireCount(startFindResult),
    requireCount(startCrewResult),
    requireCount(startConquerResult),
  ]);

  const randomPoints = (randomPointsResult.data ?? []) as RandomPointRow[];
  const dailyFindCount = new Set(randomPoints.map((row) => row.created_at)).size;

  const countTransactions = (
    type: string,
    period: Exclude<MissionPeriod, "starter">
  ) =>
    transactions.filter(
      (row) => row.type === type && isInRange(row.created_at, ranges[period])
    ).length;
  const countAttempts = (
    period: Exclude<MissionPeriod, "starter">,
    successOnly = false
  ) =>
    attempts.filter(
      (row) =>
        (!successOnly || row.success) &&
        isInRange(row.created_at, ranges[period])
    ).length;

  const monthlyCreateTransactions = transactions.filter(
    (row) =>
      row.type === "create_pin" &&
      row.related_id &&
      isInRange(row.created_at, ranges.monthly)
  );
  const monthlyPinIds = [
    ...new Set(
      monthlyCreateTransactions
        .map((row) => row.related_id)
        .filter((value): value is string => value !== null)
    ),
  ];
  let monthlyRegionCount = 0;

  if (monthlyPinIds.length > 0) {
    const { data: pins, error } = await admin
      .from("pins")
      .select("id, lat, lng")
      .in("id", monthlyPinIds);

    if (error) {
      throw new Error(error.message);
    }

    const regionCodes = new Set<string>();
    for (const pin of pins ?? []) {
      const region = findSigunguByLatLng(Number(pin.lat), Number(pin.lng));
      if (region) regionCodes.add(region.SIG_CD);
    }
    monthlyRegionCount = regionCodes.size;
  }

  const progress: Record<MissionId, number> = {
    daily_find_point: dailyFindCount,
    daily_claim_point: countTransactions("random_point_claim", "daily"),
    daily_flag_action:
      countTransactions("create_pin", "daily") +
      countTransactions("reinforce_pin", "daily") +
      countAttempts("daily"),
    weekly_claim_point: countTransactions("random_point_claim", "weekly"),
    weekly_acquire_pin:
      countTransactions("create_pin", "weekly") +
      countAttempts("weekly", true),
    weekly_reinforce: countTransactions("reinforce_pin", "weekly"),
    weekly_conquer_attempt: countAttempts("weekly"),
    weekly_attendance: countTransactions("daily_bonus", "weekly"),
    monthly_claim_point: countTransactions("random_point_claim", "monthly"),
    monthly_acquire_pin:
      countTransactions("create_pin", "monthly") +
      countAttempts("monthly", true),
    monthly_reinforce: countTransactions("reinforce_pin", "monthly"),
    monthly_attendance: countTransactions("daily_bonus", "monthly"),
    monthly_core_clear: 0,
    monthly_conquer: countAttempts("monthly", true),
    monthly_regions: monthlyRegionCount,
    start_avatar: profileResult.data.avatar_mime ? 1 : 0,
    start_plant: startPlantCount > 0 ? 1 : 0,
    start_reinforce: startReinforceCount > 0 ? 1 : 0,
    start_find: startFindCount > 0 ? 1 : 0,
    start_claim: startClaimCount > 0 ? 1 : 0,
    start_crew: startCrewCount > 0 ? 1 : 0,
    start_conquer: startConquerCount > 0 ? 1 : 0,
  };

  progress.monthly_core_clear = MONTHLY_CORE_MISSION_IDS.filter((id) => {
    const definition = MISSION_DEFINITIONS.find((item) => item.id === id)!;
    return progress[id] >= definition.target;
  }).length;

  const claimedKeys = new Set(
    (claimsResult.data ?? []).map(
      (row) => `${row.mission_id as string}:${row.period_key as string}`
    )
  );

  return MISSION_DEFINITIONS.map((definition) => {
    const periodKey = ranges[definition.period].key;
    const current = progress[definition.id];
    const claimed = claimedKeys.has(`${definition.id}:${periodKey}`);

    return {
      ...definition,
      current,
      claimed,
      claimable: current >= definition.target && !claimed,
      periodKey,
    };
  });
}
