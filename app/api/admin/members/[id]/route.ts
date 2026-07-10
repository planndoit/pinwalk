import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
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

  const { data: stats } = await admin.rpc("get_user_stats", {
    target_user_id: id,
  });

  const { data: timeline } = await admin.rpc("get_user_timeline", {
    target_user_id: id,
    page_limit: 30,
    before_at: null,
  });

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
      lastDailyBonusAt: profile.last_daily_bonus_at,
    },
    stats: stats ?? null,
    timeline: timeline ?? [],
  });
}
