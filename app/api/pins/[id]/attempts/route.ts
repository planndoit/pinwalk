import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type HistoryRow = {
  id: string;
  attacker_id: string;
  attacker_nickname: string;
  previous_owner_nickname: string | null;
  selected_probability: number;
  cost: number;
  success: boolean;
  created_at: string;
};

type SummaryRow = {
  success_count: number;
  fail_count: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const before = searchParams.get("before");
  const beforeId = searchParams.get("beforeId");
  const hasCursor = before !== null || beforeId !== null;
  if (
    hasCursor &&
    (!before ||
      !beforeId ||
      Number.isNaN(Date.parse(before)) ||
      !UUID_PATTERN.test(beforeId))
  ) {
    return jsonError("잘못된 페이지 정보입니다.");
  }

  const admin = createAdminClient();

  const historyArgs: Record<string, unknown> = {
    p_pin_id: id,
    result_limit: limit + 1,
  };
  if (hasCursor) {
    historyArgs.p_before_created_at = before;
    historyArgs.p_before_id = beforeId;
  }

  const [historyResult, summaryResult] = await Promise.all([
    admin.rpc("get_pin_attempt_history", historyArgs),
    hasCursor
      ? Promise.resolve(null)
      : admin.rpc("get_pin_attempt_summary", { p_pin_id: id }),
  ]);

  if (historyResult.error || summaryResult?.error) {
    return NextResponse.json(
      { error: "점령 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = (historyResult.data ?? []) as HistoryRow[];
  const hasMore = rows.length > limit;
  const attempts = hasMore ? rows.slice(0, limit) : rows;
  const last = attempts[attempts.length - 1];
  const nextCursor =
    hasMore && last ? { before: last.created_at, beforeId: last.id } : null;

  if (!summaryResult) {
    return NextResponse.json({ attempts, nextCursor });
  }

  const summaryRow = ((summaryResult.data ?? []) as SummaryRow[])[0];
  const successCount = summaryRow?.success_count ?? 0;
  const failCount = summaryRow?.fail_count ?? 0;

  return NextResponse.json({
    attempts,
    nextCursor,
    summary: { successCount, failCount, total: successCount + failCount },
  });
}
