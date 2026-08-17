import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushPlatform } from "@/types/notification";

function isPushPlatform(value: string): value is PushPlatform {
  return value === "ios" || value === "android" || value === "web";
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform =
    typeof body.platform === "string" && isPushPlatform(body.platform)
      ? body.platform
      : null;

  if (!token) {
    return jsonError("푸시 토큰이 필요합니다.");
  }
  if (!platform) {
    return jsonError("플랫폼이 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: now,
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    return jsonError("푸시 토큰 등록에 실패했습니다.", 500);
  }

  return NextResponse.json({ message: "푸시 토큰이 등록되었습니다." });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!token) {
    return jsonError("푸시 토큰이 필요합니다.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  if (error) {
    return jsonError("푸시 토큰 삭제에 실패했습니다.", 500);
  }

  return NextResponse.json({ message: "푸시 토큰이 삭제되었습니다." });
}
