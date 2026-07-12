export type PinStatus = "active" | "expired" | "conquered" | "hidden";

export interface Pin {
  id: string;
  user_id: string;
  text: string;
  lat: number;
  lng: number;
  radius_meters: number;
  status: PinStatus;
  cost: number;
  expires_at: string | null;
  conquered_by: string | null;
  conquered_at: string | null;
  created_at: string;
  updated_at: string;
  nickname?: string;
}

export interface PinAttempt {
  id: string;
  attacker_id: string;
  target_pin_id: string;
  new_pin_id: string | null;
  selected_probability: number;
  cost: number;
  success: boolean;
  created_at: string;
  attacker_nickname?: string;
  previous_owner_nickname?: string | null;
}
