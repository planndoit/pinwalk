import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getActiveMembership } from "@/lib/crew/membership";
import {
  getCrewName,
  notifyCrewLeaderTransferred,
} from "@/lib/notifications/events";
import { createAdminClient } from "@/lib/supabase/admin";

/** 리더 위임: 대상이 멤버여야 함. 위임 후 기존 리더는 member가 됨. */
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
    return jsonError("리더만 위임할 수 있습니다.", 403);
  }

  const body = await request.json();
  const targetUserId =
    typeof body.userId === "string" ? body.userId : "";
  if (!targetUserId) {
    return jsonError("대상 멤버가 필요합니다.");
  }
  if (targetUserId === user.id) {
    return jsonError("자기 자신에게는 위임할 수 없습니다.");
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

  const now = new Date().toISOString();

  const { error: demoteError } = await admin
    .from("crew_members")
    .update({ role: "member" })
    .eq("crew_id", crewId)
    .eq("user_id", user.id);

  if (demoteError) {
    return jsonError("위임에 실패했습니다.", 500);
  }

  const { error: promoteError } = await admin
    .from("crew_members")
    .update({ role: "leader" })
    .eq("crew_id", crewId)
    .eq("user_id", targetUserId);

  if (promoteError) {
    await admin
      .from("crew_members")
      .update({ role: "leader" })
      .eq("crew_id", crewId)
      .eq("user_id", user.id);
    return jsonError("위임에 실패했습니다.", 500);
  }

  const { error: crewError } = await admin
    .from("crews")
    .update({ leader_id: targetUserId, updated_at: now })
    .eq("id", crewId)
    .eq("status", "active");

  if (crewError) {
    return jsonError("위임에 실패했습니다.", 500);
  }

  const crewName = (await getCrewName(crewId)) ?? "크루";
  await notifyCrewLeaderTransferred({
    userId: targetUserId,
    crewId,
    crewName,
  });

  return NextResponse.json({ message: "리더를 위임했습니다." });
}
