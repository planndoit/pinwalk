import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getLatestDailyResetUtc,
  isAttendanceTransaction,
} from "@/lib/dailyBonus";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchPremiumPlaceEventCounts,
} from "@/lib/premium/analytics";

const TREND_DAYS = 14;
const PAGE_SIZE = 1000;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type AdminClient = ReturnType<typeof createAdminClient>;

function asCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value) && value.length > 0) {
    return asCount(value[0]);
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const first = Object.values(row)[0];
    return asCount(first);
  }
  return 0;
}

async function countAttendanceTxsFallback(admin: AdminClient): Promise<number> {
  let total = 0;
  let from = 0;
  for (;;) {
    // type 컬럼 REST 조회가 실패하는 환경이 있어 description 중심으로 집계
    const { data, error } = await admin
      .from("point_transactions")
      .select("description")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    total += data.filter(isAttendanceTransaction).length;
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return total;
}

async function countPositiveAmountTxsFallback(
  admin: AdminClient,
  sinceIso?: string
): Promise<number> {
  let total = 0;
  let from = 0;
  for (;;) {
    // .gt("amount", 0) REST 필터가 환경에 따라 실패해 클라이언트에서 판별한다.
    let query = admin
      .from("point_transactions")
      .select("amount")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (sinceIso) {
      query = query.gte("created_at", sinceIso);
    }
    const { data, error } = await query;
    if (error || !data) break;
    total += data.filter((row) => Number(row.amount) > 0).length;
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return total;
}

async function countDailyBonusTxs(admin: AdminClient): Promise<number> {
  const { data, error } = await admin.rpc("count_daily_bonus_txs");
  const rpcCount = error ? 0 : asCount(data);
  const scanned = rpcCount > 0 ? 0 : await countAttendanceTxsFallback(admin);

  const { count: profileCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("last_daily_bonus_at", "is", null);

  return Math.max(rpcCount, scanned, profileCount ?? 0);
}

async function countPositivePointTxs(
  admin: AdminClient,
  sinceIso?: string
): Promise<number> {
  const rpc = sinceIso
    ? await admin.rpc("count_positive_point_txs", { p_since: sinceIso })
    : await admin.rpc("count_positive_point_txs");

  if (!rpc.error) {
    const rpcCount = asCount(rpc.data);
    if (rpcCount > 0) return rpcCount;
  }

  const { count, error: countError } = await (() => {
    let query = admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .gte("amount", 1);
    if (sinceIso) {
      query = query.gte("created_at", sinceIso);
    }
    return query;
  })();

  if (!countError && (count ?? 0) > 0) {
    return count ?? 0;
  }

  return countPositiveAmountTxsFallback(admin, sinceIso);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayStartIso = todayStart.toISOString();
  const attendanceDayStart = getLatestDailyResetUtc(now);
  const trendStart = startOfLocalDay(addDays(todayStart, -(TREND_DAYS - 1)));

  const [
    members,
    todayMembers,
    activePins,
    totalPins,
    pendingRequests,
    processingRequests,
    completedRequests,
    rejectedRequests,
    activePremiumPlaces,
    inactivePremiumPlaces,
    todayAttempts,
    allAttempts,
    todayAttendance,
    recentProfiles,
    totalAttendance,
    todayPointEarnCount,
    totalPointEarnCount,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartIso),
    admin
      .from("pins")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin.from("pins").select("id", { count: "exact", head: true }),
    admin
      .from("premium_promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("premium_promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    admin
      .from("premium_promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    admin
      .from("premium_promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    admin
      .from("premium_places")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("premium_places")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    admin
      .from("pin_attempts")
      .select("success")
      .gte("created_at", todayStartIso),
    admin.from("pin_attempts").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_daily_bonus_at", attendanceDayStart.toISOString()),
    admin
      .from("profiles")
      .select("created_at")
      .gte("created_at", trendStart.toISOString())
      .order("created_at", { ascending: true }),
    countDailyBonusTxs(admin),
    countPositivePointTxs(admin, todayStartIso),
    countPositivePointTxs(admin),
  ]);

  const todayAttemptRows = todayAttempts.data ?? [];
  const todayConquerSuccess = todayAttemptRows.filter((r) => r.success).length;
  const todayConquerFail = todayAttemptRows.length - todayConquerSuccess;

  const totalMembers = members.count ?? 0;
  const dailySignups = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i++) {
    dailySignups.set(dayKey(addDays(trendStart, i)), 0);
  }
  for (const row of recentProfiles.data ?? []) {
    const key = dayKey(new Date(row.created_at));
    if (dailySignups.has(key)) {
      dailySignups.set(key, (dailySignups.get(key) ?? 0) + 1);
    }
  }

  const periodSignups = [...dailySignups.values()].reduce((a, b) => a + b, 0);
  let running = totalMembers - periodSignups;
  const memberTrend = [...dailySignups.entries()].map(([date, signups]) => {
    running += signups;
    return { date, signups, totalMembers: running };
  });

  const period30Start = startOfLocalDay(addDays(todayStart, -29)).toISOString();
  const [
    todayPremiumEvents,
    period30PremiumEvents,
    allPremiumEvents,
  ] = await Promise.all([
    fetchPremiumPlaceEventCounts({ since: todayStartIso }),
    fetchPremiumPlaceEventCounts({ since: period30Start }),
    fetchPremiumPlaceEventCounts({}),
  ]);

  const sumEventCounts = (
    counts: Awaited<ReturnType<typeof fetchPremiumPlaceEventCounts>>
  ) => Object.values(counts).reduce((sum, value) => sum + value, 0);

  return NextResponse.json({
    stats: {
      totalMembers,
      todayMembers: todayMembers.count ?? 0,
      activePins: activePins.count ?? 0,
      totalPins: totalPins.count ?? 0,
      pendingPromotionRequests: pendingRequests.count ?? 0,
      processingPromotionRequests: processingRequests.count ?? 0,
      completedPromotionRequests: completedRequests.count ?? 0,
      rejectedPromotionRequests: rejectedRequests.count ?? 0,
      activePremiumPlaces: activePremiumPlaces.count ?? 0,
      inactivePremiumPlaces: inactivePremiumPlaces.count ?? 0,
      todayConquerAttempts: todayAttemptRows.length,
      todayConquerSuccess,
      todayConquerFail,
      totalConquerAttempts: allAttempts.count ?? 0,
      todayAttendance: todayAttendance.count ?? 0,
      totalAttendance,
      todayPointEarnCount,
      totalPointEarnCount,
      todayPremiumMarkerClicks: todayPremiumEvents.marker_click,
      todayPremiumDetailOpens: todayPremiumEvents.detail_open,
      todayPremiumPhoneClicks: todayPremiumEvents.phone_click,
      todayPremiumLinkClicks: todayPremiumEvents.link_click,
      todayPremiumCouponClaims: todayPremiumEvents.coupon_claim,
      todayPremiumCouponUses: todayPremiumEvents.coupon_use,
      todayPremiumEventsTotal: sumEventCounts(todayPremiumEvents),
      period30PremiumMarkerClicks: period30PremiumEvents.marker_click,
      period30PremiumDetailOpens: period30PremiumEvents.detail_open,
      period30PremiumCouponClaims: period30PremiumEvents.coupon_claim,
      period30PremiumCouponUses: period30PremiumEvents.coupon_use,
      period30PremiumEventsTotal: sumEventCounts(period30PremiumEvents),
      totalPremiumEvents: sumEventCounts(allPremiumEvents),
    },
    memberTrend,
  });
}
