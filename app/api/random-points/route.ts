import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: randomPoints, error } = await admin
    .from("random_points")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", now);

  if (error) {
    return jsonError("랜덤 포인트 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({ randomPoints: randomPoints ?? [] });
}
