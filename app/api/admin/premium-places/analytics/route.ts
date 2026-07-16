import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  addDays,
  fetchPremiumPlaceDailyTrend,
  fetchPremiumPlaceEventCounts,
  fetchPremiumPlaceEventCountsByPlace,
  startOfLocalDay,
} from "@/lib/premium/analytics";
import { PREMIUM_PLACE_EVENT_LABELS } from "@/lib/premium/events";

const MAX_DAYS = 365;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim() || undefined;
  const daysParam = Number.parseInt(searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(daysParam, 1), MAX_DAYS)
    : 30;
  const includeTrend = searchParams.get("trend") !== "false";
  const includeByPlace = !placeId && searchParams.get("byPlace") !== "false";

  const now = new Date();
  const since = startOfLocalDay(addDays(now, -(days - 1))).toISOString();

  const [totals, dailyTrend, byPlaceMap] = await Promise.all([
    fetchPremiumPlaceEventCounts({ placeId, since }),
    includeTrend
      ? fetchPremiumPlaceDailyTrend({ placeId, since })
      : Promise.resolve([]),
    includeByPlace
      ? fetchPremiumPlaceEventCountsByPlace({ since })
      : Promise.resolve(new Map()),
  ]);

  const byPlace = [...byPlaceMap.entries()].map(([id, counts]) => ({
    placeId: id,
    counts,
  }));

  return NextResponse.json({
    periodDays: days,
    since,
    labels: PREMIUM_PLACE_EVENT_LABELS,
    totals,
    dailyTrend,
    byPlace,
  });
}
