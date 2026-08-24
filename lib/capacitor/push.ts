import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getCapacitorPlatform, isCapacitorNative } from "@/lib/capacitor/platform";

let registeredToken: string | null = null;
let listenersAttached = false;

async function registerToken(token: string): Promise<void> {
  registeredToken = token;
  await fetch("/api/my/push-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      platform: getCapacitorPlatform(),
    }),
  });
}

export async function unregisterCurrentPushToken(): Promise<void> {
  if (!registeredToken) return;

  const token = registeredToken;
  registeredToken = null;

  if (Capacitor.getPlatform() === "ios") {
    await FirebaseMessaging.deleteToken().catch(() => undefined);
  }

  await fetch("/api/my/push-tokens", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => undefined);
}

function attachAndroidPushListeners(onNavigate: (path: string) => void): void {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener("registration", (event) => {
    void registerToken(event.value);
  });

  PushNotifications.addListener("registrationError", () => {
    registeredToken = null;
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    const path = event.notification.data?.path;
    if (typeof path === "string" && path.startsWith("/")) {
      onNavigate(path);
    }
  });
}

function attachIosPushListeners(onNavigate: (path: string) => void): void {
  if (listenersAttached) return;
  listenersAttached = true;

  FirebaseMessaging.addListener("tokenReceived", (event) => {
    void registerToken(event.token);
  });

  FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
    const data = event.notification?.data as Record<string, unknown> | undefined;
    const path = data?.path;
    if (typeof path === "string" && path.startsWith("/")) {
      onNavigate(path);
    }
  });
}

async function initAndroidPush(): Promise<void> {
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== "granted") {
    return;
  }

  await PushNotifications.register();
}

async function initIosPush(): Promise<void> {
  let permission = await FirebaseMessaging.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await FirebaseMessaging.requestPermissions();
  }

  if (permission.receive !== "granted") {
    return;
  }

  const { token } = await FirebaseMessaging.getToken();
  if (token) {
    await registerToken(token);
  }
}

export async function initCapacitorPush(
  onNavigate: (path: string) => void
): Promise<void> {
  if (!isCapacitorNative()) return;

  if (Capacitor.getPlatform() === "ios") {
    attachIosPushListeners(onNavigate);
    await initIosPush();
    return;
  }

  attachAndroidPushListeners(onNavigate);
  await initAndroidPush();
}
