import { getCrewMemberCount } from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Crew, SerializedCrew } from "@/types/crew";

export async function getCrewByInviteToken(
  token: string
): Promise<SerializedCrew | null> {
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .eq("invite_token", token)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  let leaderNickname: string | null = null;
  if (data.leader_id) {
    const { data: leader } = await admin
      .from("profiles")
      .select("nickname")
      .eq("id", data.leader_id)
      .maybeSingle();
    leaderNickname = leader?.nickname ?? null;
  }

  return serializeCrew(data as Crew, {
    memberCount: await getCrewMemberCount(data.id),
    leaderNickname,
  });
}

export function buildCrewInviteDescription(crew: SerializedCrew): string {
  const stats = `${crew.areaLabel} · ${crew.memberCount}/${crew.maxMembers}명${
    crew.leaderNickname ? ` · 리더 ${crew.leaderNickname}` : ""
  }`;

  const intro = crew.description?.trim();
  if (!intro) return stats;

  const maxIntroLength = 120;
  const clipped =
    intro.length > maxIntroLength
      ? `${intro.slice(0, maxIntroLength).trim()}…`
      : intro;

  return `${clipped} (${stats})`;
}
