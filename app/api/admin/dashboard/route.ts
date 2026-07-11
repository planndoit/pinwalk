import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const TREND_DAYS = 14;

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const trendStart = startOfLocalDay(addDays(todayStart, -(TREND_DAYS - 1)));

  const [
    members,
    todayMembers,
    activePins,
    totalPins,
    pendingRequests,
    activePremiumPlaces,
    todayAttempts,
    allAttempts,
    todayPointTransactions,
    todayAttendance,
    todayEarnTransactions,
    recentProfiles,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("pins")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", now.toISOString()),
    admin.from("pins").select("id", { count: "exact", head: true }),
    admin
      .from("premium_promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("premium_places")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("pin_attempts")
      .select("success")
      .gte("created_at", todayStart.toISOString()),
    admin.from("pin_attempts").select("id", { count: "exact", head: true }),
    admin
      .from("point_transactions")
      .select("amount")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "daily_bonus")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .gt("amount", 0)
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("profiles")
      .select("created_at")
      .gte("created_at", trendStart.toISOString())
      .order("created_at", { ascending: true }),
  ]);

  const todayAttemptRows = todayAttempts.data ?? [];
  const todayConquerSuccess = todayAttemptRows.filter((r) => r.success).length;
  const todayConquerFail = todayAttemptRows.length - todayConquerSuccess;

  const todayPointVolume = (todayPointTransactions.data ?? []).reduce(
    (sum, row) => sum + Math.abs(row.amount),
    0
  );

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

  return NextResponse.json({
    stats: {
      totalMembers,
      todayMembers: todayMembers.count ?? 0,
      activePins: activePins.count ?? 0,
      totalPins: totalPins.count ?? 0,
      pendingPromotionRequests: pendingRequests.count ?? 0,
      activePremiumPlaces: activePremiumPlaces.count ?? 0,
      todayConquerAttempts: todayAttemptRows.length,
      todayConquerSuccess,
      todayConquerFail,
      totalConquerAttempts: allAttempts.count ?? 0,
      todayPointVolume,
      todayAttendance: todayAttendance.count ?? 0,
      todayPointEarnCount: todayEarnTransactions.count ?? 0,
    },
    memberTrend,
  });
}
