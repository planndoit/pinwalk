import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toBuffer(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "string") {
    if (data.startsWith("\\x")) {
      return Buffer.from(data.slice(2), "hex");
    }
    return Buffer.from(data, "base64");
  }
  return null;
}

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

  const buffer = toBuffer(profile.avatar_data);
  if (!buffer) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": profile.avatar_mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
