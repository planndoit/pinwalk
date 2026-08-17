import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { serializeNotification } from "@/lib/notifications/serialize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 50);
  const category = searchParams.get("category");

  const admin = createAdminClient();
  let query = admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError("알림 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({
    notifications: (data ?? []).map((row) =>
      serializeNotification(row as Parameters<typeof serializeNotification>[0])
    ),
  });
}
