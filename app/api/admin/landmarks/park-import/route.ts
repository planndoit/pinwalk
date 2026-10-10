import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { upsertParkCandidates } from "@/lib/landmark/upsertFromPark";
import type { ParkLandmarkCandidate } from "@/types/landmark";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const candidates = body.candidates as ParkLandmarkCandidate[] | undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "가져올 항목을 선택해주세요." },
      { status: 400 }
    );
  }

  try {
    const { inserted, updated } = await upsertParkCandidates(candidates);
    return NextResponse.json({ inserted, updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "공원 가져오기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
