import { DEFAULT_LANDMARK_RADIUS_METERS } from "@/lib/constants";
import { getLandmarkRadiusMeters } from "@/lib/env";
import { dedupeParkCandidates, getParkCandidateKey } from "@/lib/publicdata/parkClient";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParkLandmarkCandidate } from "@/types/landmark";

const LOOKUP_CHUNK = 200;

function buildParkOverview(candidate: ParkLandmarkCandidate): string | null {
  const lines: string[] = [];
  if (candidate.areaSquareMeters != null && candidate.areaSquareMeters > 0) {
    lines.push(
      `면적 ${Math.round(candidate.areaSquareMeters).toLocaleString("ko-KR")}㎡`
    );
  }
  const facilities: [string, string | null][] = [
    ["운동시설", candidate.facilities.sports],
    ["유희시설", candidate.facilities.play],
    ["편익시설", candidate.facilities.convenience],
    ["교양시설", candidate.facilities.culture],
    ["기타시설", candidate.facilities.etc],
  ];
  for (const [label, value] of facilities) {
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

function isValidCandidate(
  candidate: ParkLandmarkCandidate | null | undefined
): candidate is ParkLandmarkCandidate {
  return (
    !!candidate?.manageNo &&
    !!candidate.name &&
    typeof candidate.lat === "number" &&
    Number.isFinite(candidate.lat) &&
    typeof candidate.lng === "number" &&
    Number.isFinite(candidate.lng)
  );
}

export async function upsertParkCandidates(
  input: ParkLandmarkCandidate[]
): Promise<{ inserted: number; updated: number }> {
  const candidates = dedupeParkCandidates(
    input.filter(isValidCandidate).map((candidate) => ({
      ...candidate,
      key: getParkCandidateKey(candidate.manageNo, candidate.name),
    }))
  );
  if (candidates.length === 0) return { inserted: 0, updated: 0 };

  const radius = getLandmarkRadiusMeters() || DEFAULT_LANDMARK_RADIUS_METERS;
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const existingIdByKey = new Map<string, string>();
  const manageNos = [...new Set(candidates.map((c) => c.manageNo))];
  for (let i = 0; i < manageNos.length; i += LOOKUP_CHUNK) {
    const { data, error } = await admin
      .from("landmarks")
      .select("id, park_manage_no, park_source_name")
      .in("park_manage_no", manageNos.slice(i, i + LOOKUP_CHUNK));
    if (error) {
      throw new Error("기존 공원 랜드마크 조회에 실패했습니다.");
    }
    for (const row of data ?? []) {
      existingIdByKey.set(
        getParkCandidateKey(
          row.park_manage_no as string,
          row.park_source_name as string
        ),
        row.id as string
      );
    }
  }

  const toRow = (candidate: ParkLandmarkCandidate) => ({
    source: "park" as const,
    park_manage_no: candidate.manageNo,
    park_source_name: candidate.name,
    park_type: candidate.parkType,
    park_area_sqm: candidate.areaSquareMeters,
    name: candidate.name,
    lat: candidate.lat,
    lng: candidate.lng,
    address: candidate.address,
    overview: buildParkOverview(candidate),
    source_modified_at: candidate.referenceDate,
    updated_at: now,
  });

  const inserts = candidates
    .filter((candidate) => !existingIdByKey.has(candidate.key))
    .map((candidate) => ({
      ...toRow(candidate),
      tour_content_id: null,
      tour_content_type_id: null,
      image_url: null,
      tel: null,
      area_code: null,
      sigungu_code: null,
      radius_meters: radius,
      map_visible: false,
      is_closed: false,
      admin_note: null,
      created_at: now,
    }));

  let inserted = 0;
  if (inserts.length > 0) {
    const { data, error } = await admin
      .from("landmarks")
      .insert(inserts)
      .select("id");
    if (error) {
      throw new Error("공원 랜드마크 등록에 실패했습니다.");
    }
    inserted = data?.length ?? 0;
  }

  let updated = 0;
  for (const candidate of candidates) {
    const id = existingIdByKey.get(candidate.key);
    if (!id) continue;
    const { error } = await admin
      .from("landmarks")
      .update(toRow(candidate))
      .eq("id", id);
    if (!error) updated += 1;
  }

  return { inserted, updated };
}
