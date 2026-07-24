import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  TourApiError,
  searchTourByArea,
  searchTourByKeyword,
  searchTourByLocation,
} from "@/lib/tourapi/client";
import { upsertLandmarkCandidates } from "@/lib/landmark/upsertFromTour";

const PAGE_SIZE = 50;
const MAX_PAGES = 100;

type SearchMode = "keyword" | "area" | "location";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const mode = (body.mode as SearchMode) ?? "keyword";
  const contentTypeId =
    typeof body.contentTypeId === "string" && body.contentTypeId.trim()
      ? body.contentTypeId.trim()
      : undefined;

  try {
    let inserted = 0;
    let updated = 0;
    let fetched = 0;
    let totalCount = 0;
    let pageNo = 1;
    let hasMore = true;

    while (hasMore && pageNo <= MAX_PAGES) {
      let result: Awaited<ReturnType<typeof searchTourByArea>>;

      if (mode === "keyword") {
        const keyword = String(body.q ?? "").trim();
        result = await searchTourByKeyword({
          keyword,
          pageNo,
          numOfRows: PAGE_SIZE,
          contentTypeId,
        });
      } else if (mode === "area") {
        const areaCode = String(body.areaCode ?? "").trim();
        result = await searchTourByArea({
          areaCode,
          sigunguCode: body.sigunguCode || undefined,
          pageNo,
          numOfRows: PAGE_SIZE,
          contentTypeId,
        });
      } else if (mode === "location") {
        result = await searchTourByLocation({
          lat: Number(body.lat),
          lng: Number(body.lng),
          radiusMeters: Number(body.radius ?? 3000),
          pageNo,
          numOfRows: PAGE_SIZE,
          contentTypeId,
        });
      } else {
        return NextResponse.json(
          { error: "지원하지 않는 검색 모드입니다." },
          { status: 400 }
        );
      }

      totalCount = result.totalCount;
      hasMore = result.hasMore;
      fetched += result.candidates.length;

      if (result.candidates.length > 0) {
        const upserted = await upsertLandmarkCandidates(result.candidates);
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
    const message =
      error instanceof TourApiError
        ? error.message
        : "검색 결과 전체 가져오기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
