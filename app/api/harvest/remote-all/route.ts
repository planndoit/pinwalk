import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { REMOTE_HARVEST_MIN_TOTAL } from "@/lib/harvest";
import { harvestPins } from "@/lib/harvest/server";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const result = await harvestPins(user.id, null, "remote");

  if (!result.ok) {
    if (
      result.errorCode === "nothing_to_harvest" ||
      result.errorCode === "pin_not_found"
    ) {
      return jsonError(
        `${REMOTE_HARVEST_MIN_TOTAL}P 이상 쌓이면 전체 원격 수확할 수 있어요.`
      );
    }
    return jsonError("전체 원격 수확에 실패했습니다.", 500);
  }

  return NextResponse.json({
    points: result.points,
    granted: result.granted,
    lost: result.harvestTotal - result.granted,
    pinCount: result.pinCount,
    message: `전체 원격 수확으로 ${result.granted.toLocaleString("ko-KR")}P를 받았어요.`,
  });
}
