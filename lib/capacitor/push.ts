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

  await fetch("/api/my/push-tokens", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => undefined);
}

function attachPushListeners(onNavigate: (path: string) => void): void {
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

export async function initCapacitorPush(
  onNavigate: (path: string) => void
): Promise<void> {
  if (!isCapacitorNative()) return;

  attachPushListeners(onNavigate);

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== "granted") {
    return;
  }

  await PushNotifications.register();
}
