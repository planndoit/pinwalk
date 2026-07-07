import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNickname } from "@/lib/validation/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get("nickname") ?? "";
  const validation = validateNickname(nickname);

  if (!validation.valid) {
    return NextResponse.json({ available: false });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("nickname", nickname.trim())
    .not("username", "is", null)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
