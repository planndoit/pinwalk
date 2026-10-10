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

export async function linkPinsToLandmark(
  pinIds: string[],
  landmarkId: string
): Promise<void> {
  const unique = [...new Set(pinIds.filter(Boolean))];
  if (unique.length === 0 || !landmarkId) return;

  const admin = createAdminClient();
  await admin.from("pin_landmarks").upsert(
    unique.map((pinId) => ({
      pin_id: pinId,
      landmark_id: landmarkId,
    })),
    { onConflict: "pin_id,landmark_id", ignoreDuplicates: true }
  );
}
