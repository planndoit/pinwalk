import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getActiveMembership,
  getCrewMemberCount,
  hasPendingJoinRequest,
} from "@/lib/crew/membership";
import { notifyCrewJoinRequest } from "@/lib/notifications/events";
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
  if (membership) {
    return jsonError("이미 다른 크루에 소속되어 있습니다.", 409);
  }

  if (await hasPendingJoinRequest(user.id)) {
    return jsonError("이미 대기 중인 가입 신청이 있습니다.", 409);
  }

  const admin = createAdminClient();
  const { data: crew } = await admin
    .from("crews")
    .select("id, max_members, status")
    .eq("id", crewId)
    .eq("status", "active")
    .maybeSingle();

  if (!crew) {
    return jsonError("크루를 찾을 수 없습니다.", 404);
  }

  const memberCount = await getCrewMemberCount(crewId);
  if (memberCount >= crew.max_members) {
    return jsonError("정원이 가득 차 신청할 수 없습니다.", 409);
  }

  const { data: requestRow, error } = await admin
    .from("crew_join_requests")
    .insert({
      crew_id: crewId,
      user_id: user.id,
      status: "pending",
    })
    .select("id, crew_id, created_at")
    .single();

  if (error || !requestRow) {
    if (error?.code === "23505") {
      return jsonError("이미 대기 중인 가입 신청이 있습니다.", 409);
    }
    return jsonError("가입 신청에 실패했습니다.", 500);
  }

  await notifyCrewJoinRequest({
    crewId,
    applicantUserId: user.id,
  });

  return NextResponse.json({
    request: {
      id: requestRow.id,
      crewId: requestRow.crew_id,
      createdAt: requestRow.created_at,
    },
  });
}
