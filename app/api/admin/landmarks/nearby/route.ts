import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ADMIN_LANDMARK_NEARBY_RADIUS_METERS } from "@/lib/constants";
import { getBoundingBoxDelta, getDistanceMeters } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminNearbyLandmark } from "@/types/landmark";

const MAX_RADIUS_METERS = 5000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NearbyRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  map_visible: boolean;
  is_closed: boolean;
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");
  const radiusParam = Number.parseInt(searchParams.get("radiusMeters") ?? "", 10);
  const excludeId = searchParams.get("excludeId");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "중심 좌표가 필요합니다." },
      { status: 400 }
    );
  }

  if (excludeId !== null && !UUID_PATTERN.test(excludeId)) {
    return NextResponse.json(
      { error: "잘못된 랜드마크 ID입니다." },
      { status: 400 }
    );
  }

  const radiusMeters = Number.isFinite(radiusParam)
    ? Math.min(Math.max(radiusParam, 1), MAX_RADIUS_METERS)
    : ADMIN_LANDMARK_NEARBY_RADIUS_METERS;

  const { latDelta, lngDelta } = getBoundingBoxDelta(radiusMeters, lat);
  const admin = createAdminClient();

  let query = admin
    .from("landmarks")
    .select("id, name, lat, lng, radius_meters, map_visible, is_closed")
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "근처 랜드마크 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const landmarks: AdminNearbyLandmark[] = ((data ?? []) as NearbyRow[])
    .filter(
      (row) => getDistanceMeters(lat, lng, row.lat, row.lng) <= radiusMeters
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      radiusMeters: row.radius_meters,
      mapVisible: row.map_visible,
      isClosed: row.is_closed,
    }));

  return NextResponse.json({ landmarks, radiusMeters });
}
