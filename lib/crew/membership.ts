import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Crew, CrewMemberRole } from "@/types/crew";

export function generateCrewInviteToken(): string {
  return randomBytes(16).toString("hex");
}

export async function getActiveMembership(userId: string): Promise<{
  crew: Crew;
  role: CrewMemberRole;
} | null> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("crew_members")
    .select("role, crews!inner(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return null;

  const crewRaw = member.crews as Crew | Crew[];
  const crew = Array.isArray(crewRaw) ? crewRaw[0] : crewRaw;
  if (!crew || crew.status !== "active") return null;

  return {
    crew,
    role: member.role as CrewMemberRole,
  };
}

export async function getCrewMemberCount(crewId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("crew_members")
    .select("user_id", { count: "exact", head: true })
    .eq("crew_id", crewId);

  if (error) return 0;
  return count ?? 0;
}

export async function hasPendingJoinRequest(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("crew_join_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  return Boolean(data);
}

export async function getPendingJoinRequestForUser(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("crew_join_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  return data;
}
