import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** 내 대기 신청 취소 */
export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("crew_join_requests")
    .update({
      status: "cancelled",
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError("신청 취소에 실패했습니다.", 500);
  }
  if (!data) {
    return jsonError("대기 중인 신청이 없습니다.", 404);
  }

  return NextResponse.json({ message: "가입 신청을 취소했습니다." });
}
