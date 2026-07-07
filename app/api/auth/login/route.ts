import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { usernameToAuthEmail, normalizeUsername } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";
import { validatePassword, validateUsername } from "@/lib/validation/auth";
import { serializeProfile } from "@/lib/profile";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body as {
    username?: string;
    password?: string;
  };

  const usernameValidation = validateUsername(username ?? "");
  if (!usernameValidation.valid) {
    return jsonError(usernameValidation.error!);
  }

  const passwordValidation = validatePassword(password ?? "");
  if (!passwordValidation.valid) {
    return jsonError(passwordValidation.error!);
  }

  const normalizedUsername = normalizeUsername(username!);
  const email = usernameToAuthEmail(normalizedUsername);
  const supabase = await createClient();

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: password!,
    });

  if (signInError || !signInData.user || !signInData.session) {
    return jsonError("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, nickname, points, avatar_data, avatar_mime, last_random_point_spawn_at, created_at, updated_at"
    )
    .eq("id", signInData.user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("프로필을 불러오지 못했습니다.", 500);
  }

  return NextResponse.json({
    profile: serializeProfile(profile),
    session: signInData.session,
  });
}
