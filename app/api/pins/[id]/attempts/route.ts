import { NextResponse } from "next/server";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("get_pin_attempt_history", {
    p_pin_id: id,
    result_limit: 50,
  });

  if (error) {
    return NextResponse.json(
      { error: "점령 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const attempts = (data ?? []) as HistoryRow[];
  const successCount = attempts.filter((a) => a.success).length;
  const failCount = attempts.filter((a) => !a.success).length;

  return NextResponse.json({
    attempts,
    summary: { successCount, failCount, total: attempts.length },
  });
}
