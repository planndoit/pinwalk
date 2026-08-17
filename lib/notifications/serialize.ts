import type {
  NotificationCategory,
  NotificationType,
  SerializedNotification,
} from "@/types/notification";

type NotificationRow = {
  id: string;
  category: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function serializeNotification(
  row: NotificationRow
): SerializedNotification {
  return {
    id: row.id,
    category: row.category as NotificationCategory,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
