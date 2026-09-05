import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { getRandomPointClaimRadiusMeters } from "@/lib/env";
import { getDistanceMeters } from "@/lib/geo";
import { notifyPinToll } from "@/lib/notifications/events";
import { addPoints } from "@/lib/pins";
import {
  buildTerritoryInfo,
  calculateClaimPoints,
  calculateTollPoints,
  findContainingActivePins,
} from "@/lib/randomPoints/territory";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const { random_point_id, current_lat, current_lng } = body as {
    random_point_id?: string;
    current_lat?: number;
    current_lng?: number;
  };

  if (!random_point_id) {
    return jsonError("포인트 ID가 필요합니다.");
  }

  if (typeof current_lat !== "number" || typeof current_lng !== "number") {
    return jsonError("위치 정보가 올바르지 않습니다.");
  }

  const admin = createAdminClient();

  const { data: randomPoint, error } = await admin
    .from("random_points")
    .select("*")
    .eq("id", random_point_id)
    .eq("user_id", user.id)
    .single();

  if (error || !randomPoint) {
    return jsonError("포인트를 찾을 수 없습니다.", 404);
  }

  if (randomPoint.status !== "active") {
    return jsonError("이미 획득했거나 만료된 포인트입니다.");
  }

  if (new Date(randomPoint.expires_at) <= new Date()) {
    await admin
      .from("random_points")
      .update({ status: "expired" })
      .eq("id", random_point_id);
    return jsonError("만료된 포인트입니다.");
  }

  const distance = getDistanceMeters(
    current_lat,
    current_lng,
    randomPoint.lat,
    randomPoint.lng
  );

  const claimRadiusMeters = getRandomPointClaimRadiusMeters();

  if (distance > claimRadiusMeters) {
    return jsonError(
      `${claimRadiusMeters}m 안으로 가까이 가면 획득할 수 있어요. (현재 ${Math.round(distance)}m)`
    );
  }

  const containingPins = await findContainingActivePins(
    randomPoint.lat,
    randomPoint.lng
  );
  const territory = buildTerritoryInfo(
    randomPoint.points,
    containingPins,
    user.id
  );
  const earned = calculateClaimPoints(
    randomPoint.points,
    territory.inOwnTerritory
  );
  const otherPins = containingPins.filter((pin) => pin.user_id !== user.id);
  const tollPoints = otherPins.length > 0
    ? calculateTollPoints(randomPoint.points)
    : 0;

  const now = new Date().toISOString();

  const { data: claimed, error: claimError } = await admin
    .from("random_points")
    .update({
      status: "claimed",
      claimed_by: user.id,
      claimed_at: now,
    })
    .eq("id", random_point_id)
    .eq("status", "active")
    .select();

  if (claimError || !claimed || claimed.length === 0) {
    return jsonError("이미 획득했거나 만료된 포인트입니다.");
  }

  const claimDescription = territory.inOwnTerritory
    ? `랜덤 포인트 획득 (내 영역 ${earned}P)`
    : "랜덤 포인트 획득";

  const addResult = await addPoints(
    user.id,
    earned,
    "random_point_claim",
    claimDescription,
    random_point_id
  );

  if (!addResult.success) {
    return jsonError(addResult.error!, 500);
  }

  const tollResults: Array<{
    pinId: string;
    ownerId: string;
    tollPoints: number;
  }> = [];

  for (const pin of otherPins) {
    if (tollPoints <= 0) continue;

    const { data: tollRow, error: tollInsertError } = await admin
      .from("pin_tolls")
      .insert({
        pin_id: pin.id,
        random_point_id,
        collector_id: user.id,
        owner_id: pin.user_id,
        base_points: randomPoint.points,
        toll_points: tollPoints,
        point_lat: randomPoint.lat,
        point_lng: randomPoint.lng,
      })
      .select("id")
      .single();

    if (tollInsertError || !tollRow) {
      continue;
    }

    const tollAdd = await addPoints(
      pin.user_id,
      tollPoints,
      "pin_toll",
      "통행료",
      tollRow.id as string
    );

    if (!tollAdd.success) {
      continue;
    }

    tollResults.push({
      pinId: pin.id,
      ownerId: pin.user_id,
      tollPoints,
    });

    await notifyPinToll({
      ownerUserId: pin.user_id,
      collectorUserId: user.id,
      pinId: pin.id,
      pinText: pin.text,
      lat: pin.lat,
      lng: pin.lng,
      pointLat: randomPoint.lat,
      pointLng: randomPoint.lng,
      tollPoints,
      basePoints: randomPoint.points,
    });
  }

  const messageParts = [`${earned.toLocaleString()}P 획득!`];
  if (territory.inOwnTerritory) {
    messageParts.push("내 영역 2배");
  }
  if (tollResults.length > 0) {
    messageParts.push(
      tollResults.length === 1
        ? `통행료 ${tollPoints.toLocaleString()}P`
        : `통행료 ${tollPoints.toLocaleString()}P × ${tollResults.length}`
    );
  }

  return NextResponse.json({
    message: messageParts.join(" · "),
    points: addResult.newPoints,
    earned,
    basePoints: randomPoint.points,
    inOwnTerritory: territory.inOwnTerritory,
    tolls: tollResults,
  });
}
