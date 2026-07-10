import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select(
      "id, username, nickname, points, created_at, updated_at, last_seen_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`username.ilike.%${q}%,nickname.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: "회원 목록 조회에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    members: (data ?? []).map((m) => ({
      id: m.id,
      username: m.username,
      nickname: m.nickname,
      points: m.points,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      lastSeenAt: m.last_seen_at,
    })),
    total: count ?? 0,
    page,
    limit,
  });
}
