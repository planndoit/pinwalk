import type { CapacitorConfig } from "@capacitor/cli";
import { PRODUCTION_SITE_URL, SERVICE_NAME } from "./lib/constants";

const configuredServerUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  PRODUCTION_SITE_URL;

// pinwalk.kr 은 www.pinwalk.kr 로 308 리다이렉트된다.
// 호스트가 바뀌면 Android WebView 가 외부 브라우저로 연다.
function toAppServerUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.hostname === "pinwalk.kr") {
      url.hostname = "www.pinwalk.kr";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

const serverUrl = toAppServerUrl(configuredServerUrl);

const config: CapacitorConfig = {
  appId: "com.planndoit.pinwalk",
  appName: SERVICE_NAME,
  webDir: "public",
  experimental: {
    ios: {
      spm: {},
    },
  },
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["pinwalk.kr", "*.pinwalk.kr"],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    SystemBars: {
      insetsHandling: "css",
      style: "LIGHT",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
