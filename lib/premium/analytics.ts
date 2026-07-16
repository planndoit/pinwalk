import { createAdminClient } from "@/lib/supabase/admin";
import {
  PREMIUM_PLACE_EVENT_TYPES,
  type PremiumPlaceEventType,
} from "@/lib/premium/events";

export type PremiumPlaceEventCounts = Record<PremiumPlaceEventType, number>;

export function emptyEventCounts(): PremiumPlaceEventCounts {
  return PREMIUM_PLACE_EVENT_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as PremiumPlaceEventCounts);
}

type AggregateRow = {
  premium_place_id: string;
  event_type: string;
  event_count: number | string;
};

type DailyRow = {
  day_date: string;
  event_type: string;
  event_count: number | string;
};

export async function fetchPremiumPlaceEventCounts(params: {
  placeId?: string;
  since?: string;
  until?: string;
}): Promise<PremiumPlaceEventCounts> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("aggregate_premium_place_events", {
    p_place_id: params.placeId ?? null,
    p_since: params.since ?? null,
    p_until: params.until ?? null,
  });

  if (error || !data) {
    return emptyEventCounts();
  }

  const totals = emptyEventCounts();
  for (const row of data as AggregateRow[]) {
    if (row.event_type in totals) {
      totals[row.event_type as PremiumPlaceEventType] += Number(row.event_count);
    }
  }
  return totals;
}

export async function fetchPremiumPlaceEventCountsByPlace(params: {
  since?: string;
  until?: string;
}): Promise<Map<string, PremiumPlaceEventCounts>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("aggregate_premium_place_events", {
    p_place_id: null,
    p_since: params.since ?? null,
    p_until: params.until ?? null,
  });

  const byPlace = new Map<string, PremiumPlaceEventCounts>();
  if (error || !data) return byPlace;

  for (const row of data as AggregateRow[]) {
    const placeId = row.premium_place_id;
    if (!byPlace.has(placeId)) {
      byPlace.set(placeId, emptyEventCounts());
    }
    const counts = byPlace.get(placeId)!;
    if (row.event_type in counts) {
      counts[row.event_type as PremiumPlaceEventType] = Number(row.event_count);
    }
  }
  return byPlace;
}

export type PremiumPlaceDailyTrendPoint = {
  date: string;
  counts: PremiumPlaceEventCounts;
};

export async function fetchPremiumPlaceDailyTrend(params: {
  placeId?: string;
  since: string;
  until?: string;
}): Promise<PremiumPlaceDailyTrendPoint[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("premium_place_events_daily", {
    p_place_id: params.placeId ?? null,
    p_since: params.since,
    p_until: params.until ?? null,
  });

  if (error || !data) return [];

  const byDate = new Map<string, PremiumPlaceEventCounts>();
  for (const row of data as DailyRow[]) {
    const date =
      typeof row.day_date === "string"
        ? row.day_date.slice(0, 10)
        : String(row.day_date);
    if (!byDate.has(date)) {
      byDate.set(date, emptyEventCounts());
    }
    const counts = byDate.get(date)!;
    if (row.event_type in counts) {
      counts[row.event_type as PremiumPlaceEventType] = Number(row.event_count);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, counts }));
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
