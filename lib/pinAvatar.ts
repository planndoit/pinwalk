import type { Pin } from "@/types/pin";

export function getPinOwnerAvatarUrl(
  pin: Pick<Pin, "user_id" | "has_avatar" | "avatar_updated_at">
): string | null {
  if (!pin.has_avatar) return null;
  const params = new URLSearchParams({ userId: pin.user_id });
  if (pin.avatar_updated_at) {
    params.set("t", pin.avatar_updated_at);
  }
  return `/api/profile/avatar?${params.toString()}`;
}
