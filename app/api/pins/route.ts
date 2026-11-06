import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundingBoxDelta } from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "2000");

  const admin = createAdminClient();

  let query = admin
    .from("pins")
    .select(
      "id, user_id, text, lat, lng, radius_meters, cost, created_at, last_reinforced_at, harvest_stored, harvest_settled_at, profiles!pins_user_id_fkey(nickname, avatar_mime, avatar_updated_at), pin_landmarks(landmark_id)"
    )
    .eq("status", "active");

  if (!all) {
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "위치 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const { latDelta, lngDelta } = getBoundingBoxDelta(radius, lat);
    query = query
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);
  }

  const { data: pins, error } = await query;

  if (error) {
    return NextResponse.json({ error: "핀 조회에 실패했습니다." }, { status: 500 });
  }

  const result = (pins ?? []).map((pin) => {
    const links = (pin.pin_landmarks ?? []) as { landmark_id: string }[];
    const profile = pin.profiles as
      | {
          nickname?: string | null;
          avatar_mime?: string | null;
          avatar_updated_at?: string | null;
        }
      | {
          nickname?: string | null;
          avatar_mime?: string | null;
          avatar_updated_at?: string | null;
        }[]
      | null;
    const profileRow = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: pin.id,
      user_id: pin.user_id,
      text: pin.text,
      lat: pin.lat,
      lng: pin.lng,
      radius_meters: pin.radius_meters,
      status: "active" as const,
      cost: pin.cost,
      expires_at: null,
      conquered_by: null,
      conquered_at: null,
      created_at: pin.created_at,
      updated_at: pin.created_at,
      last_reinforced_at: pin.last_reinforced_at ?? null,
      harvest_stored: pin.harvest_stored,
      harvest_settled_at: pin.harvest_settled_at,
      nickname: profileRow?.nickname ?? "익명의 워커",
      has_avatar: Boolean(profileRow?.avatar_mime),
      avatar_updated_at: profileRow?.avatar_updated_at ?? null,
      landmark_ids: links.map((link) => link.landmark_id),
    };
  });

  return NextResponse.json({ pins: result });
}
