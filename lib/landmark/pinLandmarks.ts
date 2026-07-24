import { createAdminClient } from "@/lib/supabase/admin";

export async function getPinLandmarkIds(pinId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pin_landmarks")
    .select("landmark_id")
    .eq("pin_id", pinId);

  if (error || !data) return [];
  return data.map((row) => row.landmark_id as string);
}

export async function getLandmarkIdsByPinIds(
  pinIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (pinIds.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pin_landmarks")
    .select("pin_id, landmark_id")
    .in("pin_id", pinIds);

  if (error || !data) return map;

  for (const row of data) {
    const pinId = row.pin_id as string;
    const landmarkId = row.landmark_id as string;
    const existing = map.get(pinId);
    if (existing) {
      existing.push(landmarkId);
    } else {
      map.set(pinId, [landmarkId]);
    }
  }

  return map;
}

export async function setPinLandmarks(
  pinId: string,
  landmarkIds: string[]
): Promise<void> {
  const admin = createAdminClient();
  const unique = [...new Set(landmarkIds.filter(Boolean))];

  await admin.from("pin_landmarks").delete().eq("pin_id", pinId);

  if (unique.length === 0) return;

  await admin.from("pin_landmarks").insert(
    unique.map((landmarkId) => ({
      pin_id: pinId,
      landmark_id: landmarkId,
    }))
  );
}

export async function addPinLandmarks(
  pinId: string,
  landmarkIds: string[]
): Promise<void> {
  const unique = [...new Set(landmarkIds.filter(Boolean))];
  if (unique.length === 0) return;

  const admin = createAdminClient();
  await admin.from("pin_landmarks").upsert(
    unique.map((landmarkId) => ({
      pin_id: pinId,
      landmark_id: landmarkId,
    })),
    { onConflict: "pin_id,landmark_id", ignoreDuplicates: true }
  );
}

export async function copyPinLandmarks(
  fromPinId: string,
  toPinId: string
): Promise<string[]> {
  const landmarkIds = await getPinLandmarkIds(fromPinId);
  await setPinLandmarks(toPinId, landmarkIds);
  return landmarkIds;
}
