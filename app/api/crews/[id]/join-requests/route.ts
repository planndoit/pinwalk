import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getActiveMembership,
  getCrewMemberCount,
} from "@/lib/crew/membership";
import { recomputeAllLandmarkScoresForCrew } from "@/lib/crew/scores";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (
    !membership ||
    membership.crew.id !== crewId ||
    membership.role !== "leader"
  ) {
    return jsonError("리더만 조회할 수 있습니다.", 403);
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("crew_join_requests")
    .select("id, user_id, created_at")
    .eq("crew_id", crewId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return jsonError("신청 목록 조회에 실패했습니다.", 500);
  }

  const userIds = (rows ?? []).map((row) => row.user_id as string);
  const nicknameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      nicknameById.set(profile.id as string, profile.nickname as string);
    }
  }

  return NextResponse.json({
    requests: (rows ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      nickname: nicknameById.get(row.user_id as string) ?? "익명의 워커",
      createdAt: row.created_at,
    })),
  });
}

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
    return jsonError("리더만 처리할 수 있습니다.", 403);
  }

  const body = await request.json();
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const action =
    body.action === "approve" || body.action === "reject" ? body.action : null;

  if (!requestId || !action) {
    return jsonError("요청이 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const { data: joinRequest } = await admin
    .from("crew_join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("crew_id", crewId)
    .eq("status", "pending")
    .maybeSingle();

  if (!joinRequest) {
    return jsonError("대기 중인 신청을 찾을 수 없습니다.", 404);
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    await admin
      .from("crew_join_requests")
      .update({
        status: "rejected",
        resolved_at: now,
        resolved_by: user.id,
      })
      .eq("id", requestId);

    return NextResponse.json({ message: "가입 신청을 거절했습니다." });
  }

  const applicantMembership = await getActiveMembership(joinRequest.user_id);
  if (applicantMembership) {
    await admin
      .from("crew_join_requests")
      .update({
        status: "rejected",
        resolved_at: now,
        resolved_by: user.id,
      })
      .eq("id", requestId);
    return jsonError("이미 다른 크루에 소속된 유저입니다.", 409);
  }

  const memberCount = await getCrewMemberCount(crewId);
  if (memberCount >= membership.crew.max_members) {
    return jsonError("정원이 가득 차 승인할 수 없습니다.", 409);
  }

  const { error: memberError } = await admin.from("crew_members").insert({
    crew_id: crewId,
    user_id: joinRequest.user_id,
    role: "member",
    joined_at: now,
  });

  if (memberError) {
    if (memberError.code === "23505") {
      return jsonError("이미 소속된 유저입니다.", 409);
    }
    return jsonError("승인에 실패했습니다.", 500);
  }

  await admin
    .from("crew_join_requests")
    .update({
      status: "approved",
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq("id", requestId);

  await recomputeAllLandmarkScoresForCrew(crewId);

  return NextResponse.json({ message: "가입을 승인했습니다." });
}
