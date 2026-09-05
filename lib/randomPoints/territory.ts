import {
  FIXED_PIN_RADIUS_METERS,
  OWN_TERRITORY_POINT_MULTIPLIER,
  PIN_TOLL_RATE,
} from "@/lib/constants";
import { getBoundingBoxDelta, getDistanceMeters } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  RandomPoint,
  RandomPointTerritory,
} from "@/types/randomPoint";

export type ContainingPin = {
  id: string;
  user_id: string;
  text: string;
  lat: number;
  lng: number;
  radius_meters: number;
  nickname: string | null;
};

type PinRow = {
  id: string;
  user_id: string;
  text: string;
  lat: number;
  lng: number;
  radius_meters: number;
  profiles:
    | { nickname: string | null }
    | { nickname: string | null }[]
    | null;
};

function nicknameFromProfiles(
  profiles: PinRow["profiles"]
): string | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) {
    return profiles[0]?.nickname ?? null;
  }
  return profiles.nickname;
}

export function calculateTollPoints(basePoints: number): number {
  return Math.round(basePoints * PIN_TOLL_RATE);
}

export function calculateClaimPoints(
  basePoints: number,
  inOwnTerritory: boolean
): number {
  return inOwnTerritory
    ? basePoints * OWN_TERRITORY_POINT_MULTIPLIER
    : basePoints;
}

export function buildTerritoryInfo(
  basePoints: number,
  containingPins: ContainingPin[],
  claimerUserId: string
): RandomPointTerritory {
  const ownPins = containingPins.filter((pin) => pin.user_id === claimerUserId);
  const otherPins = containingPins.filter(
    (pin) => pin.user_id !== claimerUserId
  );
  const inOwnTerritory = ownPins.length > 0;
  const tollPerPin = otherPins.length > 0 ? calculateTollPoints(basePoints) : 0;

  return {
    inOwnTerritory,
    claimPoints: calculateClaimPoints(basePoints, inOwnTerritory),
    otherPinCount: otherPins.length,
    tollPerPin,
    otherOwners: otherPins.map((pin) => ({
      pinId: pin.id,
      userId: pin.user_id,
      nickname: pin.nickname,
      text: pin.text,
    })),
  };
}

export async function findContainingActivePins(
  lat: number,
  lng: number
): Promise<ContainingPin[]> {
  const admin = createAdminClient();
  const { latDelta, lngDelta } = getBoundingBoxDelta(
    FIXED_PIN_RADIUS_METERS,
    lat
  );

  const { data, error } = await admin
    .from("pins")
    .select(
      "id, user_id, text, lat, lng, radius_meters, profiles!pins_user_id_fkey(nickname)"
    )
    .eq("status", "active")
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data) {
    return [];
  }

  return (data as PinRow[])
    .filter(
      (pin) =>
        getDistanceMeters(lat, lng, pin.lat, pin.lng) <= pin.radius_meters
    )
    .map((pin) => ({
      id: pin.id,
      user_id: pin.user_id,
      text: pin.text,
      lat: pin.lat,
      lng: pin.lng,
      radius_meters: pin.radius_meters,
      nickname: nicknameFromProfiles(pin.profiles),
    }));
}

export async function annotateRandomPointsTerritory(
  points: RandomPoint[],
  claimerUserId: string
): Promise<RandomPoint[]> {
  if (points.length === 0) return points;

  const territories = await Promise.all(
    points.map(async (point) => {
      const containing = await findContainingActivePins(point.lat, point.lng);
      return buildTerritoryInfo(point.points, containing, claimerUserId);
    })
  );

  return points.map((point, index) => ({
    ...point,
    territory: territories[index],
  }));
}

export function buildPinFocusPath(
  pinId: string,
  lat: number,
  lng: number
): string {
  const params = new URLSearchParams({
    pinId,
    lat: String(lat),
    lng: String(lng),
  });
  return `/?${params.toString()}`;
}
