import { createAdminClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

function getFcmServerKey(): string | null {
  const key = process.env.FCM_SERVER_KEY?.trim();
  return key || null;
}

async function sendFcmMessage(
  token: string,
  payload: PushPayload
): Promise<boolean> {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    return false;
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    }),
  });

  return response.ok;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    return;
  }

  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (!tokens?.length) {
    return;
  }

  await Promise.all(
    tokens.map((row) =>
      sendFcmMessage(row.token as string, payload).catch(() => false)
    )
  );
}
