import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPinHarvestState, getRemoteHarvestAmount } from "@/lib/harvest";
import type { HarvestSummary } from "@/types/harvest";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pins")
    .select("cost, harvest_stored, harvest_settled_at")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    return jsonError("수확 정보를 불러오지 못했습니다.", 500);
  }

  const nowMs = Date.now();
  let harvestTotal = 0;
  let harvestPinCount = 0;
  let fullPinCount = 0;

  for (const pin of data ?? []) {
    const state = getPinHarvestState(
      {
        cost: Number(pin.cost),
        harvest_stored: Number(pin.harvest_stored),
        harvest_settled_at: String(pin.harvest_settled_at),
      },
      nowMs
    );
    harvestTotal += state.amount;
    if (state.amount > 0) harvestPinCount += 1;
    if (state.isFull) fullPinCount += 1;
  }

  const summary: HarvestSummary = {
    pinCount: (data ?? []).length,
    harvestTotal,
    harvestPinCount,
    fullPinCount,
    remoteAmount: getRemoteHarvestAmount(harvestTotal),
  };

  return NextResponse.json(summary);
}
