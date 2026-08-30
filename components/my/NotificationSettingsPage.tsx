"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
} from "@/lib/notifications/categories";
import type { NotificationPreferences } from "@/types/notification";

const CATEGORY_PREFERENCE_KEY: Record<
  (typeof NOTIFICATION_CATEGORY_ORDER)[number],
  keyof NotificationPreferences
> = {
  crew: "crewEnabled",
  game: "gameEnabled",
  support: "supportEnabled",
  promotion: "promotionEnabled",
  points: "pointsEnabled",
  reminder: "reminderEnabled",
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/my/notification-preferences");
    if (res.ok) {
      const data = await res.json();
      setPreferences(data.preferences ?? null);
      setError(null);
    } else {
      setError("알림 설정을 불러오지 못했습니다.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchPreferences();
    });
  }, [user, fetchPreferences]);

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!preferences) return;

    setSavingKey(key);
    setError(null);
    const previous = preferences;
    setPreferences({ ...preferences, [key]: value });

    const res = await fetch("/api/my/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });

    if (!res.ok) {
      setPreferences(previous);
      setError("설정 저장에 실패했습니다.");
    } else {
      const data = await res.json();
      setPreferences(data.preferences ?? previous);
    }

    setSavingKey(null);
  };

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6 min-h-full">
        <MySubpageHeader title="알림 설정" />

        {error ? (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        ) : null}

        {loading || !preferences ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-bold text-gray-800 mb-3">푸시</h2>
              <div className="bg-white rounded-2xl border border-gray-100">
                <label className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      푸시 알림
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      앱 푸시 알림 수신 (앱 설치 후 사용)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.pushEnabled}
                    disabled={savingKey === "pushEnabled"}
                    onChange={(e) =>
                      void updatePreference("pushEnabled", e.target.checked)
                    }
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-gray-800 mb-3">카테고리</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                {NOTIFICATION_CATEGORY_ORDER.map((category) => {
                  const prefKey = CATEGORY_PREFERENCE_KEY[category];
                  const meta = NOTIFICATION_CATEGORY_LABELS[category];
                  return (
                    <label
                      key={category}
                      className="flex items-center justify-between px-4 py-3.5 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {meta.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences[prefKey]}
                        disabled={savingKey === prefKey}
                        onChange={(e) =>
                          void updatePreference(prefKey, e.target.checked)
                        }
                        className="w-5 h-5 rounded accent-blue-600 shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
