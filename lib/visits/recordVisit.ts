import { findSigunguByLatLng } from "@/lib/geo/koreaSigungu";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordRegionVisit(params: {
  userId: string;
  lat: number;
  lng: number;
  visitedAt?: string;
}): Promise<void> {
  const region = findSigunguByLatLng(params.lat, params.lng);
  if (!region) return;

  const admin = createAdminClient();
  const { error } = await admin.rpc("record_region_visit", {
    target_user_id: params.userId,
    target_region_code: region.SIG_CD,
    visited_at: params.visitedAt ?? new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function backfillRegionVisits(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("region_visits_backfilled_at")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (profile?.region_visits_backfilled_at) return;

  const { data: pins, error: pinsError } = await admin
    .from("pins")
    .select("lat, lng, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (pinsError) {
    throw new Error(pinsError.message);
  }

  const grouped = new Map<
    string,
    { firstVisitedAt: string; pinCount: number }
  >();

  for (const pin of pins ?? []) {
    const lat = Number(pin.lat);
    const lng = Number(pin.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const region = findSigunguByLatLng(lat, lng);
    if (!region) continue;
    const createdAt =
      typeof pin.created_at === "string"
        ? pin.created_at
        : new Date().toISOString();
    const current = grouped.get(region.SIG_CD);
    if (current) {
      current.pinCount += 1;
    } else {
      grouped.set(region.SIG_CD, {
        firstVisitedAt: createdAt,
        pinCount: 1,
      });
    }
  }

  for (const [regionCode, visit] of grouped) {
    const { error } = await admin.rpc("replace_region_visit", {
      target_user_id: userId,
      target_region_code: regionCode,
      visited_at: visit.firstVisitedAt,
      visit_pin_count: visit.pinCount,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({
      region_visits_backfilled_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (flagError) {
    throw new Error(flagError.message);
  }
}
