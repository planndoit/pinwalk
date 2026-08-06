import { createAdminClient } from "@/lib/supabase/admin";

/** 한 크루의 특정 랜드마크 점수를 멤버 active 깃발 합으로 재계산. */
export async function recomputeLandmarkCrewScore(
  landmarkId: string,
  crewId: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: members } = await admin
    .from("crew_members")
    .select("user_id")
    .eq("crew_id", crewId);

  const userIds = (members ?? []).map((row) => row.user_id as string);
  if (userIds.length === 0) {
    await admin
      .from("landmark_crew_scores")
      .delete()
      .eq("landmark_id", landmarkId)
      .eq("crew_id", crewId);
    return;
  }

  const { data: links } = await admin
    .from("pin_landmarks")
    .select("pins!inner(cost, status, user_id)")
    .eq("landmark_id", landmarkId)
    .eq("pins.status", "active")
    .in("pins.user_id", userIds);

  const score = (links ?? []).reduce((sum, row) => {
    const pin = row.pins as { cost?: number } | { cost?: number }[];
    const cost = Array.isArray(pin) ? pin[0]?.cost : pin?.cost;
    return sum + (typeof cost === "number" ? cost : 0);
  }, 0);

  if (score <= 0) {
    await admin
      .from("landmark_crew_scores")
      .delete()
      .eq("landmark_id", landmarkId)
      .eq("crew_id", crewId);
    return;
  }

  const { data: existing } = await admin
    .from("landmark_crew_scores")
    .select("score")
    .eq("landmark_id", landmarkId)
    .eq("crew_id", crewId)
    .maybeSingle();

  if (!existing) {
    await admin.from("landmark_crew_scores").insert({
      landmark_id: landmarkId,
      crew_id: crewId,
      score,
      score_reached_at: now,
      updated_at: now,
    });
    return;
  }

  await admin
    .from("landmark_crew_scores")
    .update({
      score,
      ...(score !== existing.score ? { score_reached_at: now } : {}),
      updated_at: now,
    })
    .eq("landmark_id", landmarkId)
    .eq("crew_id", crewId);
}

/** 특정 랜드마크에 대해 관련 크루 점수를 전부 재동기화. */
export async function recomputeAllCrewScoresForLandmark(
  landmarkId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existingScores } = await admin
    .from("landmark_crew_scores")
    .select("crew_id")
    .eq("landmark_id", landmarkId);

  const crewIds = new Set<string>(
    (existingScores ?? []).map((row) => row.crew_id as string)
  );

  const { data: links } = await admin
    .from("pin_landmarks")
    .select("pins!inner(user_id, status)")
    .eq("landmark_id", landmarkId)
    .eq("pins.status", "active");

  const userIds = [
    ...new Set(
      (links ?? [])
        .map((row) => {
          const pin = row.pins as
            | { user_id?: string }
            | { user_id?: string }[]
            | null;
          return Array.isArray(pin) ? pin[0]?.user_id : pin?.user_id;
        })
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (userIds.length > 0) {
    const { data: members } = await admin
      .from("crew_members")
      .select("crew_id")
      .in("user_id", userIds);
    for (const row of members ?? []) {
      crewIds.add(row.crew_id as string);
    }
  }

  for (const crewId of crewIds) {
    await recomputeLandmarkCrewScore(landmarkId, crewId);
  }
}

/** 유저 소속 크루가 있으면 해당 랜드마크들의 크루 점수를 갱신. */
export async function refreshCrewLandmarkScoresForUsers(
  landmarkIds: string[],
  userIds: string[]
): Promise<void> {
  const uniqueLandmarks = [...new Set(landmarkIds.filter(Boolean))];
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  if (uniqueLandmarks.length === 0 || uniqueUsers.length === 0) return;

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("crew_members")
    .select("crew_id")
    .in("user_id", uniqueUsers);

  const crewIds = [
    ...new Set((members ?? []).map((row) => row.crew_id as string)),
  ];
  if (crewIds.length === 0) return;

  for (const landmarkId of uniqueLandmarks) {
    for (const crewId of crewIds) {
      await recomputeLandmarkCrewScore(landmarkId, crewId);
    }
  }
}

/** 멤버십 변경 후 해당 크루의 관련 랜드마크 점수 전체 재동기화. */
export async function recomputeAllLandmarkScoresForCrew(
  crewId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("crew_members")
    .select("user_id")
    .eq("crew_id", crewId);

  const userIds = (members ?? []).map((row) => row.user_id as string);

  const { data: existingScores } = await admin
    .from("landmark_crew_scores")
    .select("landmark_id")
    .eq("crew_id", crewId);

  const landmarkIds = new Set<string>(
    (existingScores ?? []).map((row) => row.landmark_id as string)
  );

  if (userIds.length > 0) {
    const { data: links } = await admin
      .from("pin_landmarks")
      .select("landmark_id, pins!inner(user_id, status)")
      .eq("pins.status", "active")
      .in("pins.user_id", userIds);

    for (const row of links ?? []) {
      landmarkIds.add(row.landmark_id as string);
    }
  }

  if (userIds.length === 0) {
    await admin.from("landmark_crew_scores").delete().eq("crew_id", crewId);
    return;
  }

  for (const landmarkId of landmarkIds) {
    await recomputeLandmarkCrewScore(landmarkId, crewId);
  }
}
