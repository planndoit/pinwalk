import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { serializeLandmark } from "@/lib/landmark/serialize";
import { absorbPinsIntoLandmark } from "@/lib/landmark/zone";
import { recomputeLandmarkScores } from "@/lib/landmark/scores";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const ids = body.ids as string[] | undefined;
  const mapVisible = body.mapVisible;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "선택된 랜드마크가 없습니다." },
      { status: 400 }
    );
  }
  if (typeof mapVisible !== "boolean") {
    return NextResponse.json(
      { error: "mapVisible 값이 필요합니다." },
      { status: 400 }
    );
  }

  const uniqueIds = [...new Set(ids.filter((id) => typeof id === "string"))];
  if (uniqueIds.length === 0) {
    return NextResponse.json(
      { error: "선택된 랜드마크가 없습니다." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: previousRows } = await admin
    .from("landmarks")
    .select("id, map_visible")
    .in("id", uniqueIds);

  const previouslyVisible = new Set(
    (previousRows ?? [])
      .filter((row) => row.map_visible === true)
      .map((row) => row.id as string)
  );

  const { data, error } = await admin
    .from("landmarks")
    .update({
      map_visible: mapVisible,
      updated_at: new Date().toISOString(),
    })
    .in("id", uniqueIds)
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: "지도 노출 일괄 변경에 실패했습니다." },
      { status: 500 }
    );
  }

  if (mapVisible) {
    for (const row of (data ?? []) as Landmark[]) {
      if (previouslyVisible.has(row.id)) continue;
      await absorbPinsIntoLandmark(row);
      await recomputeLandmarkScores(row.id);
    }
  }

  return NextResponse.json({
    updated: data?.length ?? 0,
    landmarks: ((data ?? []) as Landmark[]).map((row) => serializeLandmark(row)),
  });
}
