import { dissolveCrew } from "@/lib/crew/actions";
import {
  getActiveMembership,
  getCrewMemberCount,
} from "@/lib/crew/membership";
import { recomputeAllLandmarkScoresForCrew } from "@/lib/crew/scores";
import { createAdminClient } from "@/lib/supabase/admin";

export async function withdrawUser(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const membership = await getActiveMembership(userId);

  if (membership) {
    const crewId = membership.crew.id;
    if (membership.role === "leader") {
      const memberCount = await getCrewMemberCount(crewId);
      if (memberCount > 1) {
        return {
          ok: false,
          status: 409,
          error:
            "크루 리더는 다른 멤버에게 리더를 위임한 뒤 탈퇴할 수 있습니다.",
        };
      }
      const dissolved = await dissolveCrew(crewId, userId);
      if (!dissolved.ok) {
        return { ok: false, status: 500, error: dissolved.error };
      }
    } else {
      const admin = createAdminClient();
      const { error } = await admin
        .from("crew_members")
        .delete()
        .eq("crew_id", crewId)
        .eq("user_id", userId);

      if (error) {
        return {
          ok: false,
          status: 500,
          error: "크루 탈퇴 처리에 실패했습니다.",
        };
      }

      await recomputeAllLandmarkScoresForCrew(crewId);
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("crew_join_requests")
    .update({
      status: "cancelled",
      resolved_at: now,
      resolved_by: userId,
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return {
      ok: false,
      status: 500,
      error: "회원 탈퇴에 실패했습니다.",
    };
  }

  return { ok: true };
}
