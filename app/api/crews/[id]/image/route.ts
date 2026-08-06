import { NextResponse } from "next/server";
import { decodeBytea } from "@/lib/bytea";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const buffer = decodeBytea(data.image_data);
  if (!buffer || buffer.byteLength === 0) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": data.image_mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
