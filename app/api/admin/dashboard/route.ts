import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    members,
    todayMembers,
    activePins,
    pendingRequests,
    activePremiumPlaces,
    todayConquerAttempts,
    todayPointTransactions,
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
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("point_transactions")
      .select("amount")
      .gte("created_at", todayStart.toISOString()),
  ]);

  const todayPointVolume = (todayPointTransactions.data ?? []).reduce(
    (sum, row) => sum + Math.abs(row.amount),
    0
  );

  return NextResponse.json({
    stats: {
      totalMembers: members.count ?? 0,
      todayMembers: todayMembers.count ?? 0,
      activePins: activePins.count ?? 0,
      pendingPromotionRequests: pendingRequests.count ?? 0,
      activePremiumPlaces: activePremiumPlaces.count ?? 0,
      todayConquerAttempts: todayConquerAttempts.count ?? 0,
      todayPointVolume,
    },
  });
}
