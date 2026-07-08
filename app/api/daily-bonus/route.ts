import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { addPoints } from "@/lib/pins";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_BONUS_AMOUNT } from "@/lib/constants";
import { getLatestDailyResetUtc } from "@/lib/dailyBonus";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const boundaryIso = getLatestDailyResetUtc().toISOString();
  const nowIso = new Date().toISOString();

  const { data: current, error: readError } = await admin
    .from("profiles")
    .select("last_daily_bonus_at")
    .eq("id", user.id)
    .single();

  if (readError || !current) {
    return jsonError("프로필을 찾을 수 없습니다.", 404);
  }

  const previous = current.last_daily_bonus_at as string | null;

  const { data: claimedRows, error: claimError } = await admin
    .from("profiles")
    .update({ last_daily_bonus_at: nowIso })
    .eq("id", user.id)
    .or(`last_daily_bonus_at.is.null,last_daily_bonus_at.lt.${boundaryIso}`)
    .select("id");

  if (claimError) {
    return jsonError("출석 보너스 처리에 실패했습니다.", 500);
  }

  if (!claimedRows || claimedRows.length === 0) {
    return NextResponse.json({ claimed: false });
  }

  const result = await addPoints(
    user.id,
    DAILY_BONUS_AMOUNT,
    "daily_bonus",
    "매일 출석 보너스"
  );

  if (!result.success) {
    await admin
      .from("profiles")
      .update({ last_daily_bonus_at: previous })
      .eq("id", user.id);
    return jsonError(result.error ?? "출석 보너스 지급에 실패했습니다.", 500);
  }

  return NextResponse.json({
    claimed: true,
    amount: DAILY_BONUS_AMOUNT,
    points: result.newPoints,
  });
}
