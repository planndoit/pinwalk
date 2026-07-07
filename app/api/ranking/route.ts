import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RankingType } from "@/types/ranking";

const VALID_TYPES: RankingType[] = [
  "total_earned",
  "earn_count",
  "active_pins",
  "total_pins",
  "conquers",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "total_earned") as RankingType;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "잘못된 랭킹 유형입니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_ranking", {
    rtype: type,
    result_limit: 100,
  });

  if (error) {
    return NextResponse.json({ error: "랭킹 조회에 실패했습니다." }, { status: 500 });
  }

  const entries = (data ?? []).map(
    (
      row: { user_id: string; nickname: string; value: number },
      index: number
    ) => ({
      rank: index + 1,
      user_id: row.user_id,
      nickname: row.nickname,
      value: Number(row.value),
    })
  );

  return NextResponse.json({ type, entries });
}
