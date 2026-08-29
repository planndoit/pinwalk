import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasActiveSupabaseSession(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session != null;
}
