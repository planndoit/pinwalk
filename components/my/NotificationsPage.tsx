"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import { formatActivityDate } from "@/lib/formatDate";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
} from "@/lib/notifications/categories";
import type {
  NotificationCategory,
  SerializedNotification,
} from "@/types/notification";

const FILTER_TABS: Array<{ key: "all" | NotificationCategory; label: string }> =
  [
    { key: "all", label: "전체" },
    ...NOTIFICATION_CATEGORY_ORDER.map((key) => ({
      key,
      label: NOTIFICATION_CATEGORY_LABELS[key].label,
    })),
  ];

function resolveNotificationPath(notification: SerializedNotification): string {
  const path = notification.data.path;
  if (typeof path === "string" && path.startsWith("/")) {
    return path;
  }

  const pinId = notification.data.pinId;
  const lat = notification.data.lat;
  const lng = notification.data.lng;
  if (
    typeof pinId === "string" &&
    typeof lat === "number" &&
    typeof lng === "number"
  ) {
    return `/?pinId=${encodeURIComponent(pinId)}&lat=${lat}&lng=${lng}`;
  }

  switch (notification.type) {
    case "crew_join_request":
    case "crew_join_approved":
    case "crew_join_rejected":
    case "crew_kicked":
    case "crew_dissolved":
    case "crew_leader_transferred":
      return "/crew";
    case "inquiry_reply": {
      const inquiryId = notification.data.inquiryId;
      return typeof inquiryId === "string"
        ? `/my/inquiries/${inquiryId}`
        : "/my/inquiries";
    }
    case "pin_conquered":
    case "pin_defense_success":
    case "pin_toll":
      return "/";
    case "admin_points":
      return "/my";
    default:
      return "/my/notifications";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [filter, setFilter] = useState<"all" | NotificationCategory>("all");
  const [notifications, setNotifications] = useState<SerializedNotification[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter !== "all") {
      params.set("category", filter);
    }
    const res = await fetch(`/api/my/notifications?${params}`);
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } else {
      setNotifications([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchNotifications();
    });
  }, [user, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await fetch("/api/my/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await fetchNotifications();
    setMarkingAll(false);
  };

  const handleNotificationClick = async (
    notification: SerializedNotification
  ) => {
    if (!notification.readAt) {
      await fetch("/api/my/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
    }

    router.push(resolveNotificationPath(notification));
  };

  if (!user) return null;

  const hasUnread = notifications.some((item) => !item.readAt);

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6 min-h-full flex flex-col">
        <MySubpageHeader
          title="알림"
          action={
            hasUnread ? (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-semibold text-blue-600 disabled:opacity-50"
              >
                {markingAll ? "처리 중..." : "모두 읽음"}
              </button>
            ) : null
          }
        />

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">불러오는 중...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            알림이 없습니다.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className="w-full text-left px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      notification.readAt ? "bg-transparent" : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatActivityDate(notification.createdAt)} ·{" "}
                      {NOTIFICATION_CATEGORY_LABELS[notification.category].label}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
