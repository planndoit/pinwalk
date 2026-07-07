export interface Profile {
  id: string;
  nickname: string;
  points: number;
  last_random_point_spawn_at: string | null;
  created_at: string;
  updated_at: string;
}
