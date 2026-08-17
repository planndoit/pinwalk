import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { withdrawUser } from "@/lib/auth/withdraw";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const result = await withdrawUser(user.id);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ message: "회원 탈퇴가 완료되었습니다." });
}
