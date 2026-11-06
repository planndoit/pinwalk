import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** 지도 하이라이트용: 크루 소속 유저 id 집합 */
export async function GET() {
  const admin = createAdminClient();
  const [{ data, error }, user] = await Promise.all([
    admin.from("crew_members").select("user_id, crew_id"),
    getAuthenticatedUser(),
  ]);

  if (error) {
    return NextResponse.json(
      { error: "크루 멤버 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  const allCrewUserIds = [
    ...new Set(rows.map((row) => row.user_id as string)),
  ];

  let myCrew: { crewId: string; userIds: string[] } | null = null;
  if (user) {
    const myCrewId = rows.find((row) => row.user_id === user.id)?.crew_id as
      | string
      | undefined;
    if (myCrewId) {
      myCrew = {
        crewId: myCrewId,
        userIds: rows
          .filter((row) => row.crew_id === myCrewId)
          .map((row) => row.user_id as string),
      };
    }
  }

  return NextResponse.json({
    allCrewUserIds,
    myCrew,
    // 하위 호환: 내 크루만 포함
    crews: myCrew ? [myCrew] : [],
  });
}
