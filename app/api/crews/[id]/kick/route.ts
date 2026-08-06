import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getActiveMembership } from "@/lib/crew/membership";
import { recomputeAllLandmarkScoresForCrew } from "@/lib/crew/scores";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id: crewId } = await params;
  const membership = await getActiveMembership(user.id);
  if (
    !membership ||
    membership.crew.id !== crewId ||
    membership.role !== "leader"
  ) {
    return jsonError("리더만 추방할 수 있습니다.", 403);
  }

  const body = await request.json();
  const targetUserId =
    typeof body.userId === "string" ? body.userId : "";
  if (!targetUserId) {
    return jsonError("대상 멤버가 필요합니다.");
  }
  if (targetUserId === user.id) {
    return jsonError("자기 자신은 추방할 수 없습니다.");
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("crew_members")
    .select("user_id, role")
    .eq("crew_id", crewId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    return jsonError("멤버를 찾을 수 없습니다.", 404);
  }
  if (target.role === "leader") {
    return jsonError("리더는 추방할 수 없습니다.");
  }

  const { error } = await admin
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", targetUserId);

  if (error) {
    return jsonError("추방에 실패했습니다.", 500);
  }

  await recomputeAllLandmarkScoresForCrew(crewId);

  return NextResponse.json({ message: "멤버를 추방했습니다." });
}
