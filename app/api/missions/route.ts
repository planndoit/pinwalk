import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getUserMissions } from "@/lib/missions/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  try {
    const missions = await getUserMissions(user.id);
    return NextResponse.json({ missions });
  } catch (error) {
    console.error("mission fetch failed:", error);
    return jsonError("미션을 불러오지 못했습니다.", 500);
  }
}
