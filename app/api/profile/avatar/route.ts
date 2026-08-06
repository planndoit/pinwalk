import { NextResponse } from "next/server";
import { decodeBytea } from "@/lib/bytea";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("avatar_data, avatar_mime")
    .eq("id", userId)
    .single();

  if (error || !profile?.avatar_data || !profile.avatar_mime) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = decodeBytea(profile.avatar_data);
  if (!buffer || buffer.byteLength === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": profile.avatar_mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
