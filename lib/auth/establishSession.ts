import type { Session, SupabaseClient } from "@supabase/supabase-js";

export async function establishSession(
  supabase: SupabaseClient,
  session: Session | null | undefined
) {
  if (!session?.access_token || !session?.refresh_token) {
    throw new Error("세션 정보가 없습니다.");
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    throw error;
  }
}
