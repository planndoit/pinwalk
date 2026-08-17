export type NotificationCategory =
  | "crew"
  | "game"
  | "support"
  | "promotion"
  | "points"
  | "reminder";

export type NotificationType =
  | "crew_join_request"
  | "crew_join_approved"
  | "crew_join_rejected"
  | "crew_kicked"
  | "crew_dissolved"
  | "crew_leader_transferred"
  | "pin_conquered"
  | "pin_defense_success"
  | "inquiry_reply"
  | "admin_points";

export type PushPlatform = "ios" | "android" | "web";

export interface NotificationPreferences {
  pushEnabled: boolean;
  crewEnabled: boolean;
  gameEnabled: boolean;
  supportEnabled: boolean;
  promotionEnabled: boolean;
  pointsEnabled: boolean;
  reminderEnabled: boolean;
}

export interface SerializedNotification {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
