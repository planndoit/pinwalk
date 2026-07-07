import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundingBoxDelta } from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "2000");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "위치 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { latDelta, lngDelta } = getBoundingBoxDelta(radius, lat);
  const now = new Date().toISOString();

  const { data: pins, error } = await admin
    .from("pins")
    .select("*, profiles!pins_user_id_fkey(nickname)")
    .eq("status", "active")
    .gt("expires_at", now)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error) {
    return NextResponse.json({ error: "핀 조회에 실패했습니다." }, { status: 500 });
  }

  const result = (pins ?? []).map((pin) => ({
    ...pin,
    nickname: pin.profiles?.nickname ?? "익명의 워커",
    profiles: undefined,
  }));

  return NextResponse.json({ pins: result });
}
