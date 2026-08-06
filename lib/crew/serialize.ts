import { getCrewAreaLabel } from "@/lib/constants";
import type { Crew, SerializedCrew } from "@/types/crew";

export function serializeCrew(
  row: Crew,
  extra?: {
    memberCount?: number;
    leaderNickname?: string | null;
    combatPower?: number;
    includeInviteToken?: boolean;
  }
): SerializedCrew {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    areaCode: row.area_code,
    areaLabel: getCrewAreaLabel(row.area_code),
    maxMembers: row.max_members,
    memberCount: extra?.memberCount ?? 0,
    leaderId: row.leader_id,
    leaderNickname: extra?.leaderNickname ?? null,
    inviteToken: extra?.includeInviteToken ? row.invite_token : "",
    hasImage: Boolean(row.image_mime),
    status: row.status,
    dissolvedAt: row.dissolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    combatPower: extra?.combatPower,
  };
}
