import { DEFAULT_LANDMARK_RADIUS_METERS } from "@/lib/constants";
import { getLandmarkRadiusMeters } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark, TourApiLandmarkCandidate } from "@/types/landmark";

export async function upsertLandmarkCandidates(
  candidates: TourApiLandmarkCandidate[]
): Promise<{ inserted: number; updated: number; landmarks: Landmark[] }> {
  const radius = getLandmarkRadiusMeters() || DEFAULT_LANDMARK_RADIUS_METERS;
  const now = new Date().toISOString();
  const admin = createAdminClient();

  let inserted = 0;
  let updated = 0;
  const landmarks: Landmark[] = [];

  for (const candidate of candidates) {
    if (
      !candidate?.contentId ||
      !candidate.name ||
      typeof candidate.lat !== "number" ||
      typeof candidate.lng !== "number"
    ) {
      continue;
    }

    const row = {
      source: "tourapi" as const,
      tour_content_id: candidate.contentId,
      tour_content_type_id: candidate.contentTypeId ?? null,
      name: candidate.name,
      lat: candidate.lat,
      lng: candidate.lng,
      address: candidate.address ?? null,
      image_url: candidate.imageUrl ?? null,
      tel: candidate.tel ?? null,
      area_code: candidate.areaCode ?? null,
      sigungu_code: candidate.sigunguCode ?? null,
      source_modified_at: candidate.modifiedTime ?? null,
      updated_at: now,
    };

    const { data: existing } = await admin
      .from("landmarks")
      .select("id")
      .eq("tour_content_id", candidate.contentId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await admin
        .from("landmarks")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (!error && data) {
        updated += 1;
        landmarks.push(data as Landmark);
      }
    } else {
      const { data, error } = await admin
        .from("landmarks")
        .insert({
          ...row,
          overview: null,
          radius_meters: radius,
          map_visible: false,
          is_closed: false,
          admin_note: null,
          created_at: now,
        })
        .select("*")
        .single();
      if (!error && data) {
        inserted += 1;
        landmarks.push(data as Landmark);
      }
    }
  }

  return { inserted, updated, landmarks };
}
