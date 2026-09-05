export type RandomPointStatus = "active" | "claimed" | "expired";

export interface RandomPointTerritoryOwner {
  pinId: string;
  userId: string;
  nickname: string | null;
  text: string;
}

export interface RandomPointTerritory {
  inOwnTerritory: boolean;
  claimPoints: number;
  otherPinCount: number;
  tollPerPin: number;
  otherOwners: RandomPointTerritoryOwner[];
}

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
  territory?: RandomPointTerritory;
}

export interface PinToll {
  id: string;
  pin_id: string;
  random_point_id: string;
  collector_id: string;
  owner_id: string;
  base_points: number;
  toll_points: number;
  point_lat: number;
  point_lng: number;
  created_at: string;
  collector_nickname?: string | null;
}
