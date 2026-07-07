import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { usernameToAuthEmail, normalizeUsername } from "@/lib/auth/constants";
import { serializeProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  validateNickname,
  validatePassword,
  validateUsername,
} from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password, passwordConfirm, nickname } = body as {
    username?: string;
    password?: string;
    passwordConfirm?: string;
    nickname?: string;
  };

  const usernameValidation = validateUsername(username ?? "");
  if (!usernameValidation.valid) {
    return jsonError(usernameValidation.error!);
  }

  const passwordValidation = validatePassword(password ?? "");
  if (!passwordValidation.valid) {
    return jsonError(passwordValidation.error!);
  }

  if (password !== passwordConfirm) {
    return jsonError("비밀번호 확인이 일치하지 않습니다.");
  }

  const nicknameValidation = validateNickname(nickname ?? "");
  if (!nicknameValidation.valid) {
    return jsonError(nicknameValidation.error!);
  }

  const normalizedUsername = normalizeUsername(username!);
  const trimmedNickname = nickname!.trim();
  const admin = createAdminClient();

  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existingUsername) {
    return jsonError("이미 사용 중인 아이디입니다.");
  }

  const { data: existingNickname } = await admin
    .from("profiles")
    .select("id")
    .ilike("nickname", trimmedNickname)
    .not("username", "is", null)
    .maybeSingle();

  if (existingNickname) {
    return jsonError("이미 사용 중인 닉네임입니다.");
  }

  const email = usernameToAuthEmail(normalizedUsername);
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: password!,
      email_confirm: true,
      user_metadata: {
        username: normalizedUsername,
        nickname: trimmedNickname,
      },
    });

  if (createError || !created.user) {
    return jsonError(createError?.message ?? "회원가입에 실패했습니다.", 500);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: password!,
  });

  if (signInError) {
    return jsonError("회원가입 후 로그인에 실패했습니다.", 500);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", created.user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("프로필 생성에 실패했습니다.", 500);
  }

  return NextResponse.json({ profile: serializeProfile(profile) });
}
