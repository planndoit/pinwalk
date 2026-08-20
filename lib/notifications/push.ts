import {
  getFirebaseServiceAccount,
  sendFcmV1Message,
} from "@/lib/notifications/fcmV1";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!getFirebaseServiceAccount()) {
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
      sendFcmV1Message(row.token as string, payload).catch(() => false)
    )
  );
}
