import { Capacitor } from "@capacitor/core";
import type { PushPlatform } from "@/types/notification";

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getCapacitorPlatform(): PushPlatform {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}
