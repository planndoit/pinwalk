import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getCrewMemberCount } from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import type { Crew } from "@/types/crew";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "active";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "active" || status === "dissolved") {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: "크루 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Crew[];
  const leaderIds = [...new Set(rows.map((row) => row.leader_id))];
  const { data: leaders } =
    leaderIds.length > 0
      ? await admin.from("profiles").select("id, nickname").in("id", leaderIds)
      : { data: [] as { id: string; nickname: string }[] };

  const nicknameById = new Map(
    (leaders ?? []).map((row) => [
      row.id as string,
      (row.nickname as string) || DEFAULT_NICKNAME,
    ])
  );

  const crews = await Promise.all(
    rows.map(async (row) => {
      const memberCount = await getCrewMemberCount(row.id);
      return serializeCrew(row, {
        memberCount,
        leaderNickname: nicknameById.get(row.leader_id) ?? null,
        includeInviteToken: true,
      });
    })
  );

  return NextResponse.json({
    crews,
    total: count ?? 0,
    page,
    limit,
  });
}
