import { jsonError } from "@/lib/api/auth";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export async function requireAdmin() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { ok: false as const, response: jsonError("관리자 인증이 필요합니다.", 401) };
  }
  return { ok: true as const };
}
