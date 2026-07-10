import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { geocodeAddress } from "@/lib/naverGeocode";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { query } = body as { query?: string };

  if (!query?.trim()) {
    return jsonError("주소를 입력해주세요.");
  }

  const result = await geocodeAddress(query.trim());
  if (!result.success) {
    return jsonError(result.error);
  }

  return NextResponse.json({
    lat: result.result.lat,
    lng: result.result.lng,
    roadAddress: result.result.roadAddress,
    jibunAddress: result.result.jibunAddress,
  });
}
