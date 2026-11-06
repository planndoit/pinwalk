import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NICKNAME } from "@/lib/constants";

type TollRow = {
  id: string;
  base_points: number;
  toll_points: number;
  created_at: string;
  collector_id: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: pin, error: pinError } = await admin
    .from("pins")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (pinError) {
    return jsonError("통행료 기록 조회에 실패했습니다.", 500);
  }
  if (!pin) {
    return jsonError("핀을 찾을 수 없습니다.", 404);
  }
  if (pin.user_id !== user.id) {
    return jsonError("통행료 기록은 깃발 주인만 볼 수 있습니다.", 403);
  }

  const { data, error } = await admin
    .from("pin_tolls")
    .select("id, base_points, toll_points, created_at, collector_id")
    .eq("pin_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return jsonError("통행료 기록 조회에 실패했습니다.", 500);
  }

  const rows = (data ?? []) as TollRow[];
  const collectorIds = [...new Set(rows.map((row) => row.collector_id))];
  const nicknameById = new Map<string, string>();

  if (collectorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nickname")
      .in("id", collectorIds);

    for (const profile of profiles ?? []) {
      nicknameById.set(
        profile.id as string,
        (profile.nickname as string | null) ?? DEFAULT_NICKNAME
      );
    }
  }

  const tolls = rows.map((row) => ({
    id: row.id,
    base_points: row.base_points,
    toll_points: row.toll_points,
    created_at: row.created_at,
    collector_nickname:
      nicknameById.get(row.collector_id) ?? DEFAULT_NICKNAME,
  }));

  const totalTollPoints = tolls.reduce((sum, row) => sum + row.toll_points, 0);

  return NextResponse.json({
    tolls,
    summary: {
      total: tolls.length,
      totalTollPoints,
    },
  });
}
