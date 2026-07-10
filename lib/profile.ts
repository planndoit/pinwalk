import type { Profile } from "@/types/profile";

type ProfileRow = {
  id: string;
  username: string | null;
  nickname: string;
  points: number;
  avatar_data?: unknown;
  avatar_mime?: string | null;
  last_random_point_spawn_at: string | null;
  last_daily_bonus_at?: string | null;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function serializeProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    points: row.points,
    has_avatar: row.avatar_data != null,
    last_random_point_spawn_at: row.last_random_point_spawn_at,
    last_daily_bonus_at: row.last_daily_bonus_at ?? null,
    last_seen_at: row.last_seen_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
