import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAnnouncement } from "@/types/announcement";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, title, body, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    return jsonError("공지 목록 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({
    announcements: (data ?? []) as PublicAnnouncement[],
  });
}
