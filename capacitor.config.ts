import type { CapacitorConfig } from "@capacitor/cli";
import { PRODUCTION_SITE_URL, SERVICE_NAME } from "./lib/constants";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  PRODUCTION_SITE_URL;

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
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
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
