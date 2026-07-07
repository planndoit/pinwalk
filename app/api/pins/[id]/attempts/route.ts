import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: attempts, error } = await admin
    .from("pin_attempts")
    .select("*, profiles!pin_attempts_attacker_id_fkey(nickname)")
    .eq("target_pin_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: "점령 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const result = (attempts ?? []).map((attempt) => ({
    ...attempt,
    attacker_nickname: attempt.profiles?.nickname ?? "익명의 워커",
    profiles: undefined,
  }));

  const successCount = result.filter((a) => a.success).length;
  const failCount = result.filter((a) => !a.success).length;

  return NextResponse.json({
    attempts: result,
    summary: { successCount, failCount, total: result.length },
  });
}
