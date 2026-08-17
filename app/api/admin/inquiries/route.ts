import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { isInquiryStatus } from "@/lib/constants";
import { serializeInquiry } from "@/lib/inquiry/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Inquiry } from "@/types/inquiry";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("inquiries")
    .select(
      "*, profiles!inquiries_user_id_fkey(nickname, username)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && isInquiryStatus(status)) {
    query = query.eq("status", status);
  }

  if (q) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .or(`nickname.ilike.%${q}%,username.ilike.%${q}%`);
    const userIds = (profiles ?? []).map((row) => row.id as string);
    if (userIds.length > 0) {
      query = query.or(`title.ilike.%${q}%,user_id.in.(${userIds.join(",")})`);
    } else {
      query = query.ilike("title", `%${q}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: "문의 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    inquiries: (data ?? []).map((row) => {
      const profile = row.profiles as
        | { nickname?: string; username?: string }
        | { nickname?: string; username?: string }[]
        | null;
      const profileRow = Array.isArray(profile) ? profile[0] : profile;
      return serializeInquiry({
        ...(row as Inquiry),
        nickname: profileRow?.nickname ?? null,
        username: profileRow?.username ?? null,
      });
    }),
    total: count ?? 0,
    page,
    limit,
  });
}
