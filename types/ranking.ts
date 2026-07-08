export type RankingType =
  | "total_earned"
  | "earn_count"
  | "active_pins"
  | "total_pins"
  | "conquers";

export interface RankingEntry {
  rank: number;
  user_id: string;
  nickname: string;
  value: number;
}

export interface UserStats {
  total_earned: number;
  earn_count: number;
  active_pins: number;
  total_pins: number;
  conquers: number;
}

export interface TimelineEvent {
  id: string;
  event_type: "point" | "conquer" | "conquered_by";
  title: string;
  description: string | null;
  amount: number | null;
  created_at: string;
}
