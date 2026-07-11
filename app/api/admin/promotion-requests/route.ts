import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePromotionRequest } from "@/lib/premium/serialize";

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const statuses = splitCsv(searchParams.get("status"));
  const categories = splitCsv(searchParams.get("category"));
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("premium_promotion_requests")
    .select(
      "*, profiles!premium_promotion_requests_requester_user_id_fkey(nickname)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`store_name.ilike.%${q}%,contact_name.ilike.%${q}%`);
  }
  if (statuses.length === 1) {
    query = query.eq("status", statuses[0]);
  } else if (statuses.length > 1) {
    query = query.in("status", statuses);
  }
  if (categories.length === 1) {
    query = query.eq("category_code", categories[0]);
  } else if (categories.length > 1) {
    query = query.in("category_code", categories);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: "요청 목록 조회에 실패했습니다." }, { status: 500 });
  }

  const { data: codes } = await admin
    .from("common_codes")
    .select("code, name")
    .eq("group_code", "PREMIUM_CATEGORY");

  const codeMap = new Map((codes ?? []).map((c) => [c.code, c.name]));

  return NextResponse.json({
    requests: (data ?? []).map((row) =>
      serializePromotionRequest({
        ...row,
        requester_nickname:
          (row.profiles as { nickname?: string } | null)?.nickname ?? null,
        category_name: codeMap.get(row.category_code) ?? row.category_code,
      })
    ),
    total: count ?? 0,
    page,
    limit,
  });
}
