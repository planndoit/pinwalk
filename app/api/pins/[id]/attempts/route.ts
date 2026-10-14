import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PinAttempt } from "@/types/pin";

type SummaryRow = {
  success_count: number;
  fail_count: number;
};

const ATTEMPT_HISTORY_LIMIT = 20;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const [historyResult, summaryResult] = await Promise.all([
    admin.rpc("get_pin_attempt_history", {
      p_pin_id: id,
      result_limit: ATTEMPT_HISTORY_LIMIT,
    }),
    admin.rpc("get_pin_attempt_summary", { p_pin_id: id }),
  ]);

  if (historyResult.error || summaryResult.error) {
    return NextResponse.json(
      { error: "점령 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const attempts = (historyResult.data ?? []) as PinAttempt[];
  const summaryRow = ((summaryResult.data ?? []) as SummaryRow[])[0];
  const successCount = summaryRow?.success_count ?? 0;
  const failCount = summaryRow?.fail_count ?? 0;

  return NextResponse.json({
    attempts,
    summary: { successCount, failCount, total: successCount + failCount },
  });
}
