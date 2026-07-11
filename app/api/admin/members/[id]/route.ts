import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getLatestDailyResetUtc,
  isAttendanceTransaction,
} from "@/lib/dailyBonus";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id, username, nickname, points, created_at, updated_at, last_seen_at, last_random_point_spawn_at, last_daily_bonus_at"
    )
    .eq("id", id)
    .single();

  if (error || !profile) {
    return jsonError("회원을 찾을 수 없습니다.", 404);
  }

  const attendanceDayStart = getLatestDailyResetUtc();

  const [
    { data: statsRows, error: statsError },
    { data: timeline },
    { data: pointTxs },
  ] = await Promise.all([
    admin.rpc("get_user_stats", { target_user_id: id }),
    admin.rpc("get_user_timeline", {
      target_user_id: id,
      page_limit: 30,
      before_at: null,
    }),
    admin
      .from("point_transactions")
      .select("type, description")
      .eq("user_id", id),
  ]);

  if (statsError) {
    return jsonError("통계 조회에 실패했습니다.", 500);
  }

  const lastDailyBonusAt = profile.last_daily_bonus_at as string | null;
  const attendedToday =
    lastDailyBonusAt != null &&
    new Date(lastDailyBonusAt).getTime() >= attendanceDayStart.getTime();

  const attendanceFromTxs = (pointTxs ?? []).filter(isAttendanceTransaction)
    .length;
  const attendanceFromTimeline = (
    Array.isArray(timeline) ? timeline : []
  ).filter(
    (event: { title?: string }) => event.title === "출석 보너스"
  ).length;
  const attendanceCount = Math.max(attendanceFromTxs, attendanceFromTimeline);

  const statsRow = Array.isArray(statsRows) ? statsRows[0] : statsRows;
  const stats = statsRow
    ? {
        total_earned: Number(statsRow.total_earned),
        earn_count: Number(statsRow.earn_count),
        active_pins: Number(statsRow.active_pins),
        total_pins: Number(statsRow.total_pins),
        conquers: Number(statsRow.conquers),
        attendance_count: attendanceCount,
        attended_today: attendedToday,
      }
    : null;

  return NextResponse.json({
    member: {
      id: profile.id,
      username: profile.username,
      nickname: profile.nickname,
      points: profile.points,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastSeenAt: profile.last_seen_at,
      lastRandomPointSpawnAt: profile.last_random_point_spawn_at,
      lastDailyBonusAt,
    },
    stats,
    timeline: timeline ?? [],
  });
}
