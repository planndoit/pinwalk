import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundingBoxDelta } from "@/lib/geo";
import { getLandmarkIdsByPinIds } from "@/lib/landmark/pinLandmarks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "2000");

  const admin = createAdminClient();

  let query = admin
    .from("pins")
    .select("*, profiles!pins_user_id_fkey(nickname)")
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

  const pinList = pins ?? [];
  const landmarkIdsByPin = await getLandmarkIdsByPinIds(
    pinList.map((pin) => pin.id as string)
  );

  const result = pinList.map((pin) => ({
    ...pin,
    nickname: pin.profiles?.nickname ?? "익명의 워커",
    landmark_ids: landmarkIdsByPin.get(pin.id as string) ?? [],
    profiles: undefined,
  }));

  return NextResponse.json({ pins: result });
}
