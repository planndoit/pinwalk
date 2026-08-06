import { createAdminClient } from "@/lib/supabase/admin";

export async function getCombatPowersByUserIds(
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("pins")
    .select("user_id, cost")
    .eq("status", "active")
    .in("user_id", userIds);

  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const cost = typeof row.cost === "number" ? row.cost : 0;
    map.set(userId, (map.get(userId) ?? 0) + cost);
  }

  return map;
}

/** 존 안 active 깃발이 1개 이상인 랜드마크 수 */
export async function getLandmarkConquestCountsByUserIds(
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("pin_landmarks")
    .select("landmark_id, pins!inner(user_id, status)")
    .eq("pins.status", "active")
    .in("pins.user_id", userIds);

  const sets = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const pin = row.pins as
      | { user_id?: string }
      | { user_id?: string }[]
      | null;
    const userId = Array.isArray(pin) ? pin[0]?.user_id : pin?.user_id;
    const landmarkId = row.landmark_id as string;
    if (!userId) continue;
    let set = sets.get(userId);
    if (!set) {
      set = new Set();
      sets.set(userId, set);
    }
    set.add(landmarkId);
  }

  for (const [userId, set] of sets) {
    map.set(userId, set.size);
  }

  return map;
}
