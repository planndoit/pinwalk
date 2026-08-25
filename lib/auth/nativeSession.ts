import { Preferences } from "@capacitor/preferences";
import { isCapacitorNative } from "@/lib/capacitor/platform";

const NATIVE_SESSION_KEY = "pinwalk_supabase_session";

export type NativeSessionTokens = {
  access_token: string;
  refresh_token: string;
};

export async function persistNativeSession(
  session: NativeSessionTokens | null | undefined
): Promise<void> {
  if (!isCapacitorNative()) return;
  if (!session?.access_token || !session?.refresh_token) return;

  await Preferences.set({
    key: NATIVE_SESSION_KEY,
    value: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });
}

export async function loadNativeSession(): Promise<NativeSessionTokens | null> {
  if (!isCapacitorNative()) return null;

  const { value } = await Preferences.get({ key: NATIVE_SESSION_KEY });
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<NativeSessionTokens>;
    if (
      typeof parsed.access_token === "string" &&
      parsed.access_token &&
      typeof parsed.refresh_token === "string" &&
      parsed.refresh_token
    ) {
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      };
    }
  } catch {
    // ignore corrupt storage
  }

  return null;
}

export async function clearNativeSession(): Promise<void> {
  if (!isCapacitorNative()) return;
  await Preferences.remove({ key: NATIVE_SESSION_KEY });
}
