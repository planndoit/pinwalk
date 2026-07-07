import { NextResponse } from "next/server";
import { normalizeUsername } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUsername } from "@/lib/validation/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "";
  const validation = validateUsername(username);

  if (!validation.valid) {
    return NextResponse.json({ available: false });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
