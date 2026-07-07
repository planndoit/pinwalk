import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return jsonError("프로필을 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { nickname } = body as { nickname?: string };

  if (typeof nickname !== "string" || !nickname.trim()) {
    return jsonError("닉네임을 입력해주세요.");
  }

  const trimmed = nickname.trim();
  if (trimmed.length > 20) {
    return jsonError("닉네임은 20자 이하로 입력해주세요.");
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({
      nickname: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error || !profile) {
    return jsonError("닉네임 변경에 실패했습니다.", 500);
  }

  return NextResponse.json({ profile });
}
