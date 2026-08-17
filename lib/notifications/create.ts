import { isCategoryEnabled } from "@/lib/notifications/categories";
import { getOrCreateNotificationPreferences } from "@/lib/notifications/preferences";
import { sendPushToUser } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NotificationCategory,
  NotificationType,
} from "@/types/notification";

export interface CreateNotificationInput {
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function stringifyPushData(
  data: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    result[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return result;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<string | null> {
  const preferences = await getOrCreateNotificationPreferences(input.userId);
  if (!isCategoryEnabled(preferences, input.category)) {
    return null;
  }

  const admin = createAdminClient();
  const data = input.data ?? {};

  const { data: row, error } = await admin
    .from("notifications")
    .insert({
      user_id: input.userId,
      category: input.category,
      type: input.type,
      title: input.title,
      body: input.body,
      data,
    })
    .select("id")
    .single();

  if (error || !row) {
    return null;
  }

  if (preferences.pushEnabled) {
    await sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      data: stringifyPushData({
        notificationId: row.id,
        type: input.type,
        ...data,
      }),
    });
  }

  return row.id as string;
}

export async function getProfileNickname(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();

  return (data?.nickname as string | undefined) ?? null;
}
