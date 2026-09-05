import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NICKNAME } from "@/lib/constants";

type TollRow = {
  id: string;
  pin_id: string;
  random_point_id: string;
  collector_id: string;
  owner_id: string;
  base_points: number;
  toll_points: number;
  point_lat: number;
  point_lng: number;
  created_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("pin_tolls")
    .select(
      "id, pin_id, random_point_id, collector_id, owner_id, base_points, toll_points, point_lat, point_lng, created_at"
    )
    .eq("pin_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "통행료 기록 조회에 실패했습니다." },
      { status: 500 }
    );
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
    pin_id: row.pin_id,
    random_point_id: row.random_point_id,
    collector_id: row.collector_id,
    owner_id: row.owner_id,
    base_points: row.base_points,
    toll_points: row.toll_points,
    point_lat: row.point_lat,
    point_lng: row.point_lng,
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
