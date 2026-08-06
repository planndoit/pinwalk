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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("crews")
    .select("image_data, image_mime")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data?.image_data || !data.image_mime) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = toBuffer(data.image_data);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": data.image_mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
