import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  TourApiError,
  fetchTourDetailCommon,
  searchTourByArea,
  searchTourByKeyword,
  searchTourByLocation,
} from "@/lib/tourapi/client";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "keyword";
  const pageNo = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const numOfRows = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const contentTypeId = searchParams.get("contentTypeId")?.trim() || undefined;

  try {
    if (mode === "keyword") {
      const keyword = searchParams.get("q")?.trim() ?? "";
      const result = await searchTourByKeyword({
        keyword,
        pageNo,
        numOfRows,
        contentTypeId,
      });
      return NextResponse.json(result);
    }

    if (mode === "area") {
      const areaCode = searchParams.get("areaCode")?.trim() ?? "";
      const sigunguCode = searchParams.get("sigunguCode")?.trim() || undefined;
      const result = await searchTourByArea({
        areaCode,
        sigunguCode,
        pageNo,
        numOfRows,
        contentTypeId,
      });
      return NextResponse.json(result);
    }

    if (mode === "location") {
      const lat = Number.parseFloat(searchParams.get("lat") ?? "");
      const lng = Number.parseFloat(searchParams.get("lng") ?? "");
      const radiusMeters = Number.parseInt(
        searchParams.get("radius") ?? "3000",
        10
      );
      const result = await searchTourByLocation({
        lat,
        lng,
        radiusMeters,
        pageNo,
        numOfRows,
        contentTypeId,
      });
      return NextResponse.json(result);
    }

    if (mode === "detail") {
      const contentId = searchParams.get("contentId")?.trim() ?? "";
      if (!contentId) {
        return NextResponse.json(
          { error: "contentId가 필요합니다." },
          { status: 400 }
        );
      }
      const detail = await fetchTourDetailCommon(contentId);
      return NextResponse.json({ detail });
    }

    return NextResponse.json(
      { error: "지원하지 않는 검색 모드입니다." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof TourApiError
        ? error.message
        : "TourAPI 조회에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
