import { getBoundingBoxDelta, getDistanceMeters } from "@/lib/geo";
import { getPremiumPlaceRadiusMeters } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PremiumPlace } from "@/types/premium";

export async function findActivePremiumPlacesNear(
  lat: number,
  lng: number,
  radiusMeters: number = getPremiumPlaceRadiusMeters()
): Promise<PremiumPlace[]> {
  const admin = createAdminClient();
  const { latDelta, lngDelta } = getBoundingBoxDelta(radiusMeters, lat);

  const { data, error } = await admin
    .from("premium_places")
    .select("*")
    .eq("is_active", true)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data) return [];

  return data.filter(
    (place) =>
      getDistanceMeters(lat, lng, place.lat, place.lng) <= radiusMeters
  ) as PremiumPlace[];
}

export async function getCommonCodeName(
  groupCode: string,
  code: string
): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("common_codes")
    .select("name")
    .eq("group_code", groupCode)
    .eq("code", code)
    .maybeSingle();
  return data?.name ?? code;
}
