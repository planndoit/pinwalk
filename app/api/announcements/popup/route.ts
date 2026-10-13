import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAnnouncement } from "@/types/announcement";

export async function GET() {
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, title, body, published_at")
    .eq("is_published", true)
    .or(`popup_ends_at.is.null,popup_ends_at.gt.${nowIso}`)
    .order("published_at", { ascending: false });

  if (error) {
    return jsonError("공지 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({
    announcements: (data ?? []) as PublicAnnouncement[],
  });
}
