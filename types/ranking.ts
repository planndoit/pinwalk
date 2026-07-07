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
  event_type: "pin_create" | "point_earn" | "conquer";
  title: string;
  description: string;
  created_at: string;
}
