import { NextResponse } from "next/server";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

type AttemptRow = {
  id: string;
  attacker_id: string;
  target_pin_id: string;
  new_pin_id: string | null;
  selected_probability: number;
  cost: number;
  success: boolean;
  created_at: string;
  profiles?: { nickname: string } | null;
};

type HistoryItem = {
  id: string;
  attacker_id: string;
  attacker_nickname: string;
  previous_owner_nickname: string | null;
  selected_probability: number;
  cost: number;
  success: boolean;
  created_at: string;
};

function toHistoryItem(
  attempt: AttemptRow,
  previousOwnerNickname: string | null
): HistoryItem {
  return {
    id: attempt.id,
    attacker_id: attempt.attacker_id,
    attacker_nickname: attempt.profiles?.nickname ?? DEFAULT_NICKNAME,
    previous_owner_nickname: previousOwnerNickname,
    selected_probability: attempt.selected_probability,
    cost: attempt.cost,
    success: attempt.success,
    created_at: attempt.created_at,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  const items: HistoryItem[] = [];

  const { data: failures, error: failError } = await admin
    .from("pin_attempts")
    .select("*, profiles!pin_attempts_attacker_id_fkey(nickname)")
    .eq("target_pin_id", id)
    .eq("success", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (failError) {
    return NextResponse.json(
      { error: "점령 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  for (const attempt of (failures ?? []) as AttemptRow[]) {
    items.push(toHistoryItem(attempt, null));
  }

  let currentPinId = id;
  const seenAttemptIds = new Set<string>();

  for (let depth = 0; depth < 20; depth++) {
    const { data: successAttempt, error: successError } = await admin
      .from("pin_attempts")
      .select("*, profiles!pin_attempts_attacker_id_fkey(nickname)")
      .eq("new_pin_id", currentPinId)
      .eq("success", true)
      .maybeSingle();

    if (successError || !successAttempt) break;
    if (seenAttemptIds.has(successAttempt.id)) break;
    seenAttemptIds.add(successAttempt.id);

    const attempt = successAttempt as AttemptRow;

    const { data: previousPin } = await admin
      .from("pins")
      .select("user_id")
      .eq("id", attempt.target_pin_id)
      .single();

    let previousOwnerNickname = DEFAULT_NICKNAME;
    if (previousPin?.user_id) {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("nickname")
        .eq("id", previousPin.user_id)
        .single();
      previousOwnerNickname = ownerProfile?.nickname ?? DEFAULT_NICKNAME;
    }

    items.push(toHistoryItem(attempt, previousOwnerNickname));
    currentPinId = attempt.target_pin_id;
  }

  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const limited = items.slice(0, 50);
  const successCount = limited.filter((a) => a.success).length;
  const failCount = limited.filter((a) => !a.success).length;

  return NextResponse.json({
    attempts: limited,
    summary: { successCount, failCount, total: limited.length },
  });
}
