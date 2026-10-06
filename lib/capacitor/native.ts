import { App } from "@capacitor/app";
import {
  CapacitorCookies,
  SystemBarType,
  SystemBars,
  SystemBarsStyle,
} from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { isCapacitorNative } from "@/lib/capacitor/platform";

async function touchCookiePersistence(): Promise<void> {
  try {
    await CapacitorCookies.setCookie({
      url: window.location.origin,
      key: "pinwalk_cookie_flush",
      value: "1",
      path: "/",
    });
    await CapacitorCookies.deleteCookie({
      url: window.location.origin,
      key: "pinwalk_cookie_flush",
    });
  } catch {
    // best-effort flush on background
  }
}

export async function initCapacitorNative(): Promise<void> {
  if (!isCapacitorNative()) return;

  document.documentElement.classList.add("cap-native");

  try {
    await SystemBars.setStyle({
      style: SystemBarsStyle.Light,
      bar: SystemBarType.StatusBar,
    });
  } catch {
    // SystemBars may be unavailable on some WebView builds.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash auto-hide is configured in capacitor.config.ts.
  }

  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      void SplashScreen.hide().catch(() => undefined);
      return;
    }
    void touchCookiePersistence();
  });
}
