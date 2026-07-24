import { NextResponse } from "next/server";
import { getLandmarkRanking } from "@/lib/landmark/scores";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: landmark, error } = await admin
    .from("landmarks")
    .select("id, map_visible")
    .eq("id", id)
    .maybeSingle();

  if (error || !landmark || landmark.map_visible !== true) {
    return NextResponse.json(
      { error: "랜드마크를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const ranking = await getLandmarkRanking(id, 10);

  return NextResponse.json({
    ranking: ranking.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      nickname: row.nickname,
      score: row.score,
      scoreReachedAt: row.scoreReachedAt,
    })),
  });
}
