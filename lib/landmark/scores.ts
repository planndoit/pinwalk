import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import { recomputeAllCrewScoresForLandmark } from "@/lib/crew/scores";

export type LandmarkScoreSubjectType = "user" | "crew";

export interface LandmarkScoreRow {
  landmarkId: string;
  subjectType: LandmarkScoreSubjectType;
  subjectId: string;
  score: number;
  scoreReachedAt: string;
  /** 개인 닉네임 또는 크루명 */
  nickname: string;
}

/** 한 유저의 해당 랜드마크 합산을 재계산·저장. */
export async function refreshUserLandmarkScore(
  landmarkId: string,
  userId: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: links } = await admin
    .from("pin_landmarks")
    .select("pins!inner(cost, status, user_id)")
    .eq("landmark_id", landmarkId)
    .eq("pins.status", "active")
    .eq("pins.user_id", userId);

  const score = (links ?? []).reduce((sum, row) => {
    const pin = row.pins as { cost?: number } | { cost?: number }[];
    const cost = Array.isArray(pin) ? pin[0]?.cost : pin?.cost;
    return sum + (typeof cost === "number" ? cost : 0);
  }, 0);

  if (score <= 0) {
    await admin
      .from("landmark_user_scores")
      .delete()
      .eq("landmark_id", landmarkId)
      .eq("user_id", userId);
    return;
  }

  const { data: existing } = await admin
    .from("landmark_user_scores")
    .select("score")
    .eq("landmark_id", landmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("landmark_user_scores").insert({
      landmark_id: landmarkId,
      user_id: userId,
      score,
      score_reached_at: now,
      updated_at: now,
    });
    return;
  }

  const reachedAt = score !== existing.score ? now : undefined;

  await admin
    .from("landmark_user_scores")
    .update({
      score,
      ...(reachedAt ? { score_reached_at: reachedAt } : {}),
      updated_at: now,
    })
    .eq("landmark_id", landmarkId)
    .eq("user_id", userId);
}

export async function refreshUsersLandmarkScores(
  landmarkIds: string[],
  userIds: string[]
): Promise<void> {
  const uniqueLandmarks = [...new Set(landmarkIds.filter(Boolean))];
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  for (const landmarkId of uniqueLandmarks) {
    for (const userId of uniqueUsers) {
      await refreshUserLandmarkScore(landmarkId, userId);
    }
  }
}

/** 랜드마크 전체 점수를 pin_landmarks 기준으로 재동기화. */
export async function recomputeLandmarkScores(
  landmarkId: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: links } = await admin
    .from("pin_landmarks")
    .select("pins!inner(user_id, cost, status)")
    .eq("landmark_id", landmarkId)
    .eq("pins.status", "active");

  const scoreByUser = new Map<string, number>();
  for (const row of links ?? []) {
    const pin = row.pins as
      | { user_id?: string; cost?: number }
      | { user_id?: string; cost?: number }[];
    const userId = Array.isArray(pin) ? pin[0]?.user_id : pin?.user_id;
    const cost = Array.isArray(pin) ? pin[0]?.cost : pin?.cost;
    if (!userId) continue;
    const value = typeof cost === "number" ? cost : 0;
    scoreByUser.set(userId, (scoreByUser.get(userId) ?? 0) + value);
  }

  const { data: existingRows } = await admin
    .from("landmark_user_scores")
    .select("user_id, score")
    .eq("landmark_id", landmarkId);

  const existing = new Map(
    (existingRows ?? []).map((row) => [row.user_id as string, row.score as number])
  );

  for (const [userId, score] of scoreByUser) {
    const prev = existing.get(userId);
    if (prev === undefined) {
      await admin.from("landmark_user_scores").insert({
        landmark_id: landmarkId,
        user_id: userId,
        score,
        score_reached_at: now,
        updated_at: now,
      });
    } else if (prev !== score) {
      await admin
        .from("landmark_user_scores")
        .update({
          score,
          score_reached_at: now,
          updated_at: now,
        })
        .eq("landmark_id", landmarkId)
        .eq("user_id", userId);
    }
    existing.delete(userId);
  }

  for (const userId of existing.keys()) {
    await admin
      .from("landmark_user_scores")
      .delete()
      .eq("landmark_id", landmarkId)
      .eq("user_id", userId);
  }

  await recomputeAllCrewScoresForLandmark(landmarkId);
}

export async function getLandmarkRanking(
  landmarkId: string,
  limit = 10
): Promise<LandmarkScoreRow[]> {
  const admin = createAdminClient();
  const [{ data: userRows }, { data: crewRows }] = await Promise.all([
    admin
      .from("landmark_user_scores")
      .select(
        "landmark_id, user_id, score, score_reached_at, profiles!inner(nickname)"
      )
      .eq("landmark_id", landmarkId)
      .gt("score", 0),
    admin
      .from("landmark_crew_scores")
      .select(
        "landmark_id, crew_id, score, score_reached_at, crews!inner(name, status)"
      )
      .eq("landmark_id", landmarkId)
      .gt("score", 0),
  ]);

  const merged: LandmarkScoreRow[] = [];

  for (const row of userRows ?? []) {
    const profile = row.profiles as
      | { nickname?: string }
      | { nickname?: string }[]
      | null;
    const nickname = Array.isArray(profile)
      ? profile[0]?.nickname
      : profile?.nickname;
    merged.push({
      landmarkId: row.landmark_id as string,
      subjectType: "user",
      subjectId: row.user_id as string,
      score: row.score as number,
      scoreReachedAt: row.score_reached_at as string,
      nickname: nickname?.trim() || DEFAULT_NICKNAME,
    });
  }

  for (const row of crewRows ?? []) {
    const crew = row.crews as
      | { name?: string; status?: string }
      | { name?: string; status?: string }[]
      | null;
    const crewRow = Array.isArray(crew) ? crew[0] : crew;
    if (!crewRow || crewRow.status !== "active") continue;
    merged.push({
      landmarkId: row.landmark_id as string,
      subjectType: "crew",
      subjectId: row.crew_id as string,
      score: row.score as number,
      scoreReachedAt: row.score_reached_at as string,
      nickname: crewRow.name?.trim() || "크루",
    });
  }

  merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.scoreReachedAt !== b.scoreReachedAt) {
      return a.scoreReachedAt < b.scoreReachedAt ? -1 : 1;
    }
    return a.nickname.localeCompare(b.nickname, "ko");
  });

  return merged.slice(0, limit);
}

function isBetterScore(
  candidate: { score: number; scoreReachedAt: string },
  current: { score: number; scoreReachedAt: string } | undefined
): boolean {
  if (!current) return true;
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }
  return candidate.scoreReachedAt < current.scoreReachedAt;
}

export async function getTitleHoldersByLandmarkIds(
  landmarkIds: string[]
): Promise<Map<string, LandmarkScoreRow>> {
  const map = new Map<string, LandmarkScoreRow>();
  if (landmarkIds.length === 0) return map;

  const admin = createAdminClient();
  const BATCH = 80;

  for (let i = 0; i < landmarkIds.length; i += BATCH) {
    const batch = landmarkIds.slice(i, i + BATCH);
    const [{ data: userData }, { data: crewData }] = await Promise.all([
      admin
        .from("landmark_user_scores")
        .select(
          "landmark_id, user_id, score, score_reached_at, profiles!inner(nickname)"
        )
        .in("landmark_id", batch)
        .gt("score", 0),
      admin
        .from("landmark_crew_scores")
        .select(
          "landmark_id, crew_id, score, score_reached_at, crews!inner(name, status)"
        )
        .in("landmark_id", batch)
        .gt("score", 0),
    ]);

    for (const row of userData ?? []) {
      const landmarkId = row.landmark_id as string;
      const score = row.score as number;
      const scoreReachedAt = row.score_reached_at as string;
      const current = map.get(landmarkId);
      if (
        !isBetterScore(
          { score, scoreReachedAt },
          current
            ? { score: current.score, scoreReachedAt: current.scoreReachedAt }
            : undefined
        )
      ) {
        continue;
      }

      const profile = row.profiles as
        | { nickname?: string }
        | { nickname?: string }[]
        | null;
      const nickname = Array.isArray(profile)
        ? profile[0]?.nickname
        : profile?.nickname;
      map.set(landmarkId, {
        landmarkId,
        subjectType: "user",
        subjectId: row.user_id as string,
        score,
        scoreReachedAt,
        nickname: nickname?.trim() || DEFAULT_NICKNAME,
      });
    }

    for (const row of crewData ?? []) {
      const crew = row.crews as
        | { name?: string; status?: string }
        | { name?: string; status?: string }[]
        | null;
      const crewRow = Array.isArray(crew) ? crew[0] : crew;
      if (!crewRow || crewRow.status !== "active") continue;

      const landmarkId = row.landmark_id as string;
      const score = row.score as number;
      const scoreReachedAt = row.score_reached_at as string;
      const current = map.get(landmarkId);
      if (
        !isBetterScore(
          { score, scoreReachedAt },
          current
            ? { score: current.score, scoreReachedAt: current.scoreReachedAt }
            : undefined
        )
      ) {
        continue;
      }

      map.set(landmarkId, {
        landmarkId,
        subjectType: "crew",
        subjectId: row.crew_id as string,
        score,
        scoreReachedAt,
        nickname: crewRow.name?.trim() || "크루",
      });
    }
  }

  return map;
}
