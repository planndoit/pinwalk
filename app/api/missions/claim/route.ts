import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getMissionDefinition } from "@/lib/missions/definitions";
import { getUserMissions } from "@/lib/missions/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ClaimResultRow = {
  claimed: boolean;
  new_points: number;
};

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.");
  }

  const missionId =
    typeof body === "object" &&
    body !== null &&
    "missionId" in body &&
    typeof body.missionId === "string"
      ? body.missionId
      : null;
  const definition = missionId ? getMissionDefinition(missionId) : null;

  if (!missionId || !definition) {
    return jsonError("유효하지 않은 미션입니다.");
  }

  try {
    const missions = await getUserMissions(user.id);
    const mission = missions.find((item) => item.id === missionId);

    if (!mission) {
      return jsonError("유효하지 않은 미션입니다.");
    }
    if (mission.claimed) {
      return jsonError("이미 받은 미션 보상입니다.", 409);
    }
    if (mission.current < mission.target) {
      return jsonError("아직 미션을 완료하지 않았습니다.");
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("claim_mission_reward", {
      target_user_id: user.id,
      target_mission_id: mission.id,
      target_period_key: mission.periodKey,
      target_reward_points: mission.reward,
      target_description: `${mission.title} 미션 보상`,
    });

    if (error) {
      console.error("mission claim failed:", error);
      return jsonError("미션 보상 지급에 실패했습니다.", 500);
    }

    const result = ((data ?? []) as ClaimResultRow[])[0];
    if (!result?.claimed) {
      return jsonError("이미 받은 미션 보상입니다.", 409);
    }

    return NextResponse.json({
      message: `${mission.reward.toLocaleString()}P를 받았습니다.`,
      points: Number(result.new_points),
      missionId: mission.id,
    });
  } catch (error) {
    console.error("mission claim failed:", error);
    return jsonError("미션 보상 지급에 실패했습니다.", 500);
  }
}
