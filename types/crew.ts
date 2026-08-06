export type CrewStatus = "active" | "dissolved";
export type CrewMemberRole = "leader" | "member";
export type CrewJoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface Crew {
  id: string;
  name: string;
  description: string | null;
  area_code: string;
  max_members: number;
  leader_id: string;
  invite_token: string;
  image_data?: string | null;
  image_mime: string | null;
  status: CrewStatus;
  dissolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrewMember {
  crew_id: string;
  user_id: string;
  role: CrewMemberRole;
  joined_at: string;
}

export interface CrewJoinRequest {
  id: string;
  crew_id: string;
  user_id: string;
  status: CrewJoinRequestStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SerializedCrew {
  id: string;
  name: string;
  description: string | null;
  areaCode: string;
  areaLabel: string;
  maxMembers: number;
  memberCount: number;
  leaderId: string;
  leaderNickname?: string | null;
  inviteToken: string;
  hasImage: boolean;
  status: CrewStatus;
  dissolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  combatPower?: number;
}

export interface SerializedCrewMember {
  userId: string;
  nickname: string;
  role: CrewMemberRole;
  joinedAt: string;
  combatPower: number;
  contributionPoints: number;
  landmarkConquests: number;
  hasAvatar: boolean;
}
