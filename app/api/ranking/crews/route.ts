import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCombatPowersByUserIds } from "@/lib/crew/stats";
import { serializeCrew } from "@/lib/crew/serialize";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import type { Crew } from "@/types/crew";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "100", 10) || 100)
  );

  const admin = createAdminClient();
  const { data: crews, error } = await admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .eq("status", "active");

  if (error) {
    return NextResponse.json(
      { error: "크루 랭킹 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = (crews ?? []) as Crew[];
  if (rows.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const crewIds = rows.map((row) => row.id);
  const { data: members } = await admin
    .from("crew_members")
    .select("crew_id, user_id")
    .in("crew_id", crewIds);

  const membersByCrew = new Map<string, string[]>();
  const allUserIds: string[] = [];
  for (const row of members ?? []) {
    const crewId = row.crew_id as string;
    const userId = row.user_id as string;
    const list = membersByCrew.get(crewId) ?? [];
    list.push(userId);
    membersByCrew.set(crewId, list);
    allUserIds.push(userId);
  }

  const combatByUser = await getCombatPowersByUserIds(allUserIds);

  const leaderIds = [...new Set(rows.map((row) => row.leader_id))];
  const { data: leaders } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", leaderIds);
  const nicknameById = new Map(
    (leaders ?? []).map((row) => [
      row.id as string,
      (row.nickname as string) || DEFAULT_NICKNAME,
    ])
  );

  const entries = rows
    .map((crew) => {
      const memberIds = membersByCrew.get(crew.id) ?? [];
      const combatPower = memberIds.reduce(
        (sum, userId) => sum + (combatByUser.get(userId) ?? 0),
        0
      );
      return {
        crew: serializeCrew(crew, {
          memberCount: memberIds.length,
          leaderNickname: nicknameById.get(crew.leader_id) ?? null,
          combatPower,
        }),
        combatPower,
      };
    })
    .sort((a, b) => {
      if (b.combatPower !== a.combatPower) return b.combatPower - a.combatPower;
      return a.crew.name.localeCompare(b.crew.name, "ko");
    })
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      crewId: row.crew.id,
      name: row.crew.name,
      areaLabel: row.crew.areaLabel,
      memberCount: row.crew.memberCount,
      maxMembers: row.crew.maxMembers,
      hasImage: row.crew.hasImage,
      value: row.combatPower,
      leaderNickname: row.crew.leaderNickname ?? null,
    }));

  return NextResponse.json({ entries });
}
