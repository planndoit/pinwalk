import { NextResponse } from "next/server";
import { serializeLandmark } from "@/lib/landmark/serialize";
import { getTitleHoldersByLandmarkIds } from "@/lib/landmark/scores";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("landmarks")
    .select("*")
    .eq("map_visible", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "랜드마크 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const landmarks = (data ?? []) as Landmark[];
  const holders = await getTitleHoldersByLandmarkIds(
    landmarks.map((row) => row.id)
  );

  return NextResponse.json({
    landmarks: landmarks.map((row) => {
      const holder = holders.get(row.id);
      return serializeLandmark(row, {
        titleHolderNickname: holder?.nickname ?? null,
        titleHolderScore: holder?.score ?? null,
      });
    }),
  });
}
