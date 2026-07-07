import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_user_stats", {
    target_user_id: user.id,
  });

  if (error || !data?.[0]) {
    return jsonError("통계 조회에 실패했습니다.", 500);
  }

  const stats = data[0];
  return NextResponse.json({
    stats: {
      total_earned: Number(stats.total_earned),
      earn_count: Number(stats.earn_count),
      active_pins: Number(stats.active_pins),
      total_pins: Number(stats.total_pins),
      conquers: Number(stats.conquers),
    },
  });
}
