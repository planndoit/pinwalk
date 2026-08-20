import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isCapacitorNative } from "@/lib/capacitor/platform";

export async function initCapacitorNative(): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#f9fafb" });
  } catch {
    // StatusBar may be unavailable on some WebView builds.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash auto-hide is configured in capacitor.config.ts.
  }

  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      void SplashScreen.hide().catch(() => undefined);
    }
  });
}
