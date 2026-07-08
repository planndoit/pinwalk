export interface Profile {
  id: string;
  username: string | null;
  nickname: string;
  points: number;
  has_avatar: boolean;
  last_random_point_spawn_at: string | null;
  last_daily_bonus_at: string | null;
  created_at: string;
  updated_at: string;
}
