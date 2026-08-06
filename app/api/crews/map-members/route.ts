import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 지도 하이라이트용: 크루 소속 유저 id 집합 */
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("crew_members").select("user_id, crew_id");

  if (error) {
    return NextResponse.json(
      { error: "크루 멤버 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const allCrewUserIds = [
    ...new Set((data ?? []).map((row) => row.user_id as string)),
  ];
  const byCrew = new Map<string, string[]>();
  for (const row of data ?? []) {
    const crewId = row.crew_id as string;
    const userId = row.user_id as string;
    const list = byCrew.get(crewId) ?? [];
    list.push(userId);
    byCrew.set(crewId, list);
  }

  return NextResponse.json({
    allCrewUserIds,
    crews: [...byCrew.entries()].map(([crewId, userIds]) => ({
      crewId,
      userIds,
    })),
  });
}
