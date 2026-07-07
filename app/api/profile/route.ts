import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { AVATAR_MAX_BYTES } from "@/lib/auth/constants";
import { serializeProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateNickname } from "@/lib/validation/auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, nickname, points, avatar_data, avatar_mime, last_random_point_spawn_at, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return jsonError("프로필을 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({ profile: serializeProfile(profile) });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { nickname, avatar_base64, avatar_mime, remove_avatar } = body as {
    nickname?: string;
    avatar_base64?: string;
    avatar_mime?: string;
    remove_avatar?: boolean;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof nickname === "string") {
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      return jsonError(validation.error!);
    }

    const trimmed = nickname.trim();
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("nickname", trimmed)
      .not("username", "is", null)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return jsonError("이미 사용 중인 닉네임입니다.");
    }

    updates.nickname = trimmed;
  }

  if (remove_avatar) {
    updates.avatar_data = null;
    updates.avatar_mime = null;
  } else if (typeof avatar_base64 === "string" && avatar_base64) {
    if (
      typeof avatar_mime !== "string" ||
      !["image/jpeg", "image/webp", "image/png"].includes(avatar_mime)
    ) {
      return jsonError("지원하지 않는 이미지 형식입니다.");
    }

    const buffer = Buffer.from(avatar_base64, "base64");
    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      return jsonError("프로필 사진은 50KB 이하여야 합니다.");
    }

    updates.avatar_data = buffer;
    updates.avatar_mime = avatar_mime;
  }

  if (Object.keys(updates).length === 1) {
    return jsonError("변경할 내용이 없습니다.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(
      "id, username, nickname, points, avatar_data, avatar_mime, last_random_point_spawn_at, created_at, updated_at"
    )
    .single();

  if (error || !profile) {
    return jsonError("프로필 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({ profile: serializeProfile(profile) });
}
