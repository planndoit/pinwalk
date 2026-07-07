export type RandomPointStatus = "active" | "claimed" | "expired";

export interface RandomPoint {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  points: number;
  status: RandomPointStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
}
