import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { dissolveCrew } from "@/lib/crew/actions";
import {
  getActiveMembership,
  getCrewMemberCount,
} from "@/lib/crew/membership";
import { recomputeAllLandmarkScoresForCrew } from "@/lib/crew/scores";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
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
    return jsonError("소속 크루가 아닙니다.", 403);
  }

  const memberCount = await getCrewMemberCount(crewId);

  if (membership.role === "leader") {
    if (memberCount <= 1) {
      const result = await dissolveCrew(crewId, user.id);
      if (!result.ok) return jsonError(result.error, 500);
      return NextResponse.json({
        message: "크루를 해산했습니다.",
        dissolved: true,
      });
    }
    return jsonError(
      "리더는 다른 멤버에게 리더를 위임한 뒤 탈퇴할 수 있습니다.",
      409
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", user.id);

  if (error) {
    return jsonError("탈퇴에 실패했습니다.", 500);
  }

  await recomputeAllLandmarkScoresForCrew(crewId);

  return NextResponse.json({ message: "크루에서 탈퇴했습니다." });
}
