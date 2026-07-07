import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_user_timeline", {
    target_user_id: user.id,
    page_limit: limit,
    before_at: before,
  });

  if (error) {
    return jsonError("활동 내역 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({ events: data ?? [] });
}
