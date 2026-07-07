import { PIN_RADIUS_METERS } from "./constants";
import { getBoundingBoxDelta, getDistanceMeters } from "./geo";
import { createAdminClient } from "./supabase/admin";
import type { Pin } from "@/types/pin";

export async function findActivePinsNear(
  lat: number,
  lng: number,
  radiusMeters: number = PIN_RADIUS_METERS
): Promise<Pin[]> {
  const admin = createAdminClient();
  const { latDelta, lngDelta } = getBoundingBoxDelta(radiusMeters, lat);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("pins")
    .select("*")
    .eq("status", "active")
    .gt("expires_at", now)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error || !data) {
    return [];
  }

  return data.filter(
    (pin) => getDistanceMeters(lat, lng, pin.lat, pin.lng) <= radiusMeters
  ) as Pin[];
}

export async function deductPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<{ success: boolean; error?: string; newPoints?: number }> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "프로필을 찾을 수 없습니다." };
  }

  if (profile.points < amount) {
    return { success: false, error: "포인트가 부족합니다." };
  }

  const newPoints = profile.points - amount;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ points: newPoints, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: "포인트 차감에 실패했습니다." };
  }

  const { error: txError } = await admin.from("point_transactions").insert({
    user_id: userId,
    amount: -amount,
    type,
    description,
    related_id: relatedId ?? null,
  });

  if (txError) {
    return { success: false, error: "거래 기록 저장에 실패했습니다." };
  }

  return { success: true, newPoints };
}

export async function addPoints(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string
): Promise<{ success: boolean; error?: string; newPoints?: number }> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "프로필을 찾을 수 없습니다." };
  }

  const newPoints = profile.points + amount;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ points: newPoints, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: "포인트 지급에 실패했습니다." };
  }

  const { error: txError } = await admin.from("point_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    related_id: relatedId ?? null,
  });

  if (txError) {
    return { success: false, error: "거래 기록 저장에 실패했습니다." };
  }

  return { success: true, newPoints };
}
