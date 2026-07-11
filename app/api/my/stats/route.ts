import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  computeAttendanceStreak,
  isAttendanceTransaction,
} from "@/lib/dailyBonus";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const [{ data, error }, failAttempts, { data: pointTxs }] = await Promise.all(
    [
      admin.rpc("get_user_stats", {
        target_user_id: user.id,
      }),
      admin
        .from("pin_attempts")
        .select("id", { count: "exact", head: true })
        .eq("attacker_id", user.id)
        .eq("success", false),
      admin
        .from("point_transactions")
        .select("description, created_at")
        .eq("user_id", user.id),
    ]
  );

  if (error || !data?.[0]) {
    return jsonError("통계 조회에 실패했습니다.", 500);
  }

  const attendanceTxs = (pointTxs ?? []).filter(isAttendanceTransaction);
  const attendanceCount = attendanceTxs.length;
  const attendanceStreak = computeAttendanceStreak(
    attendanceTxs.map((tx) => tx.created_at as string)
  );

  const stats = data[0];
  return NextResponse.json({
    stats: {
      total_earned: Number(stats.total_earned),
      earn_count: Number(stats.earn_count),
      active_pins: Number(stats.active_pins),
      total_pins: Number(stats.total_pins),
      conquers: Number(stats.conquers),
      conquer_fails: failAttempts.count ?? 0,
      attendance_count: attendanceCount,
      attendance_streak: attendanceStreak,
    },
  });
}
