import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPreferences } from "@/types/notification";

type PreferenceRow = {
  push_enabled: boolean;
  crew_enabled: boolean;
  game_enabled: boolean;
  support_enabled: boolean;
  promotion_enabled: boolean;
  points_enabled: boolean;
  reminder_enabled: boolean;
};

export function serializePreferences(
  row: PreferenceRow
): NotificationPreferences {
  return {
    pushEnabled: row.push_enabled,
    crewEnabled: row.crew_enabled,
    gameEnabled: row.game_enabled,
    supportEnabled: row.support_enabled,
    promotionEnabled: row.promotion_enabled,
    pointsEnabled: row.points_enabled,
    reminderEnabled: row.reminder_enabled,
  };
}

function preferenceUpdates(
  preferences: Partial<NotificationPreferences>
): Partial<PreferenceRow> {
  const updates: Partial<PreferenceRow> = {};
  if (typeof preferences.pushEnabled === "boolean") {
    updates.push_enabled = preferences.pushEnabled;
  }
  if (typeof preferences.crewEnabled === "boolean") {
    updates.crew_enabled = preferences.crewEnabled;
  }
  if (typeof preferences.gameEnabled === "boolean") {
    updates.game_enabled = preferences.gameEnabled;
  }
  if (typeof preferences.supportEnabled === "boolean") {
    updates.support_enabled = preferences.supportEnabled;
  }
  if (typeof preferences.promotionEnabled === "boolean") {
    updates.promotion_enabled = preferences.promotionEnabled;
  }
  if (typeof preferences.pointsEnabled === "boolean") {
    updates.points_enabled = preferences.pointsEnabled;
  }
  if (typeof preferences.reminderEnabled === "boolean") {
    updates.reminder_enabled = preferences.reminderEnabled;
  }
  return updates;
}

export async function getOrCreateNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return serializePreferences(existing as PreferenceRow);
  }

  const { data: created, error } = await admin
    .from("notification_preferences")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !created) {
    return {
      pushEnabled: true,
      crewEnabled: true,
      gameEnabled: true,
      supportEnabled: true,
      promotionEnabled: true,
      pointsEnabled: true,
      reminderEnabled: true,
    };
  }

  return serializePreferences(created as PreferenceRow);
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const admin = createAdminClient();
  await getOrCreateNotificationPreferences(userId);

  const updates = preferenceUpdates(preferences);
  if (Object.keys(updates).length === 0) {
    return getOrCreateNotificationPreferences(userId);
  }

  const { data, error } = await admin
    .from("notification_preferences")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("알림 설정 저장에 실패했습니다.");
  }

  return serializePreferences(data as PreferenceRow);
}
