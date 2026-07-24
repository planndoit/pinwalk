import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { upsertLandmarkCandidates } from "@/lib/landmark/upsertFromTour";
import { serializeLandmark } from "@/lib/landmark/serialize";
import type { TourApiLandmarkCandidate } from "@/types/landmark";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const candidates = body.candidates as TourApiLandmarkCandidate[] | undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "가져올 항목을 선택해주세요." },
      { status: 400 }
    );
  }

  const { inserted, updated, landmarks } =
    await upsertLandmarkCandidates(candidates);

  return NextResponse.json({
    inserted,
    updated,
    landmarks: landmarks.map((row) => serializeLandmark(row)),
  });
}
