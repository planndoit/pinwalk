import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { usernameToAuthEmail, normalizeUsername } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (!profileRow) {
    return jsonError("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(normalizedUsername),
    password: password!,
  });

  if (signInError) {
    return jsonError("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileRow.id)
    .single();

  if (profileError || !profile) {
    return jsonError("프로필을 불러오지 못했습니다.", 500);
  }

  return NextResponse.json({ profile: serializeProfile(profile) });
}
