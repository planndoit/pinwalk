"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { initCapacitorNative } from "@/lib/capacitor/native";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  initCapacitorPush,
  unregisterCurrentPushToken,
} from "@/lib/capacitor/push";

export default function CapacitorBridge() {
  const router = useRouter();
  const { user } = useAuth();
  const pushInitializedRef = useRef(false);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    void initCapacitorNative();
  }, []);

  useEffect(() => {
    if (!isCapacitorNative() || !user) {
      if (!user) {
        void unregisterCurrentPushToken();
        pushInitializedRef.current = false;
      }
      return;
    }

    if (pushInitializedRef.current) return;
    pushInitializedRef.current = true;

    void initCapacitorPush((path) => {
      router.push(path);
    });
  }, [user, router]);

  return null;
}
