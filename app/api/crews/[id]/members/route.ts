import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getActiveMembership } from "@/lib/crew/membership";
import {
  getCombatPowersByUserIds,
  getLandmarkConquestCountsByUserIds,
} from "@/lib/crew/stats";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SerializedCrewMember } from "@/types/crew";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id: crewId } = await params;
  const membership = await getActiveMembership(user.id);
  if (!membership || membership.crew.id !== crewId) {
    return jsonError("소속 크루만 조회할 수 있습니다.", 403);
  }

  const admin = createAdminClient();
  const { data: members, error } = await admin
    .from("crew_members")
    .select("user_id, role, joined_at")
    .eq("crew_id", crewId)
    .order("joined_at", { ascending: true });

  if (error) {
    return jsonError("멤버 조회에 실패했습니다.", 500);
  }

  const rows = members ?? [];
  const userIds = rows.map((row) => row.user_id as string);

  const [combatByUser, conquestByUser, profiles] = await Promise.all([
    getCombatPowersByUserIds(userIds),
    getLandmarkConquestCountsByUserIds(userIds),
    admin.from("profiles").select("id, nickname, avatar_mime").in("id", userIds),
  ]);

  const profileById = new Map(
    (profiles.data ?? []).map((row) => [
      row.id as string,
      {
        nickname: (row.nickname as string) || DEFAULT_NICKNAME,
        hasAvatar: Boolean(row.avatar_mime),
      },
    ])
  );

  const serialized: SerializedCrewMember[] = rows.map((row) => {
    const userId = row.user_id as string;
    const combatPower = combatByUser.get(userId) ?? 0;
    const profile = profileById.get(userId);
    return {
      userId,
      nickname: profile?.nickname ?? DEFAULT_NICKNAME,
      role: row.role as "leader" | "member",
      joinedAt: row.joined_at as string,
      combatPower,
      contributionPoints: combatPower,
      landmarkConquests: conquestByUser.get(userId) ?? 0,
      hasAvatar: profile?.hasAvatar ?? false,
    };
  });

  serialized.sort((a, b) => {
    if (b.combatPower !== a.combatPower) return b.combatPower - a.combatPower;
    return a.nickname.localeCompare(b.nickname, "ko");
  });

  return NextResponse.json({ members: serialized });
}
