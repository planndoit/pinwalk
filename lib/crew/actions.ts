import { createAdminClient } from "@/lib/supabase/admin";

export async function dissolveCrew(
  crewId: string,
  dissolvedBy: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: crew } = await admin
    .from("crews")
    .select("id, status")
    .eq("id", crewId)
    .maybeSingle();

  if (!crew || crew.status !== "active") {
    return { ok: false, error: "크루를 찾을 수 없습니다." };
  }

  await admin.from("crew_members").delete().eq("crew_id", crewId);
  await admin.from("landmark_crew_scores").delete().eq("crew_id", crewId);
  await admin
    .from("crew_join_requests")
    .update({
      status: "cancelled",
      resolved_at: now,
      resolved_by: dissolvedBy,
    })
    .eq("crew_id", crewId)
    .eq("status", "pending");

  const { error } = await admin
    .from("crews")
    .update({
      status: "dissolved",
      dissolved_at: now,
      updated_at: now,
    })
    .eq("id", crewId)
    .eq("status", "active");

  if (error) {
    return { ok: false, error: "크루 해산에 실패했습니다." };
  }

  return { ok: true };
}
