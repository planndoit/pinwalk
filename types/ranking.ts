export type RankingType =
  | "combat_power"
  | "active_pins"
  | "total_earned"
  | "conquers";

export interface RankingEntry {
  rank: number;
  user_id: string;
  nickname: string;
  value: number;
  earn_count?: number | null;
}

export interface UserStats {
  total_earned: number;
  earn_count: number;
  active_pins: number;
  total_pins: number;
  conquers: number;
  combat_power: number;
  conquer_fails?: number;
  attendance_count?: number;
  attendance_streak?: number;
}

export interface TimelineEvent {
  id: string;
  event_type: "point" | "conquer" | "conquered_by";
  title: string;
  description: string | null;
  amount: number | null;
  created_at: string;
}
