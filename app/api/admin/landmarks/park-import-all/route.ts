import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ParkApiError, searchParks } from "@/lib/publicdata/parkClient";
import { upsertParkCandidates } from "@/lib/landmark/upsertFromPark";

const PAGE_SIZE = 1000;
const MAX_PAGES = 30;

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const provider = optionalText(body.provider);
  const name = optionalText(body.name);
  const parkType = optionalText(body.parkType);
  const region = optionalText(body.region);

  try {
    let inserted = 0;
    let updated = 0;
    let fetched = 0;
    let totalCount = 0;
    let pageNo = 1;
    let hasMore = true;

    while (hasMore && pageNo <= MAX_PAGES) {
      const result = await searchParks({
        provider,
        name,
        parkType,
        region,
        pageNo,
        numOfRows: PAGE_SIZE,
      });

      totalCount = result.totalCount;
      hasMore = result.hasMore;
      fetched += result.candidates.length;

      if (result.candidates.length > 0) {
        const upserted = await upsertParkCandidates(result.candidates);
        inserted += upserted.inserted;
        updated += upserted.updated;
      }

      if (!hasMore || result.candidates.length === 0) break;
      pageNo += 1;
    }

    return NextResponse.json({
      inserted,
      updated,
      fetched,
      totalCount,
      pages: pageNo,
      truncated: hasMore && pageNo > MAX_PAGES,
    });
  } catch (error) {
    if (error instanceof ParkApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message =
      error instanceof Error ? error.message : "공원 전체 가져오기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
