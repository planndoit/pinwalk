"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type NotificationBellProps = {
  variant?: "chip" | "plain";
  className?: string;
};

export default function NotificationBell({
  variant = "plain",
  className = "",
}: NotificationBellProps) {
  const { user, loading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const res = await fetch("/api/my/notifications/unread-count");
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    queueMicrotask(() => {
      void fetchUnreadCount();
    });
  }, [authLoading, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;

    const onFocus = () => {
      void fetchUnreadCount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, fetchUnreadCount]);

  if (authLoading || !user) {
    return null;
  }

  const badge =
    unreadCount > 0 ? (
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-4 text-center">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null;

  const icon = (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  if (variant === "chip") {
    return (
      <Link
        href="/my/notifications"
        aria-label={`알림${unreadCount > 0 ? `, ${unreadCount}개 미읽음` : ""}`}
        className={`relative box-border h-9 inline-flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-transparent px-2.5 text-gray-700 active:scale-98 transition-transform ${className}`}
      >
        {icon}
        {badge}
      </Link>
    );
  }

  return (
    <Link
      href="/my/notifications"
      aria-label={`알림${unreadCount > 0 ? `, ${unreadCount}개 미읽음` : ""}`}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 ${className}`}
    >
      {icon}
      {badge}
    </Link>
  );
}
