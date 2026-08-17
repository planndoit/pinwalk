import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const notificationId =
    typeof body.notificationId === "string" ? body.notificationId : null;
  const markAll = body.all === true;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (markAll) {
    const { error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return jsonError("알림 읽음 처리에 실패했습니다.", 500);
    }

    return NextResponse.json({ message: "모든 알림을 읽음 처리했습니다." });
  }

  if (!notificationId) {
    return jsonError("알림 ID가 필요합니다.");
  }

  const { error } = await admin
    .from("notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return jsonError("알림 읽음 처리에 실패했습니다.", 500);
  }

  return NextResponse.json({ message: "알림을 읽음 처리했습니다." });
}
