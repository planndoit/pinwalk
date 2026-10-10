import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ParkApiError, searchParks } from "@/lib/publicdata/parkClient";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const pageNo = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const numOfRows = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10))
  );

  try {
    const result = await searchParks({
      provider: searchParams.get("provider") ?? undefined,
      name: searchParams.get("name") ?? undefined,
      parkType: searchParams.get("parkType") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      pageNo,
      numOfRows,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof ParkApiError ? error.message : "공원 조회에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
