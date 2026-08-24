import type { CapacitorConfig } from "@capacitor/cli";
import { SERVICE_NAME } from "./lib/constants";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://pinwalk.vercel.app";

const config: CapacitorConfig = {
  appId: "com.planndoit.pinwalk",
  appName: SERVICE_NAME,
  webDir: "public",
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": {
            symlink: true,
          },
        },
      },
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
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#f9fafb",
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
