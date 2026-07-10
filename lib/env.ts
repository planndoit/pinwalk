function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPremiumPlaceRadiusMeters(): number {
  return readInt("PREMIUM_PLACE_RADIUS_METERS", 100);
}

export function getPremiumCouponSpawnDistanceMeters(): number {
  return readInt("PREMIUM_COUPON_SPAWN_DISTANCE_METERS", 10);
}

export function getPremiumCouponClaimRadiusMeters(): number {
  return readInt("PREMIUM_COUPON_CLAIM_RADIUS_METERS", 15);
}

export function getPremiumCouponSpawnExpiresMinutes(): number {
  return readInt("PREMIUM_COUPON_SPAWN_EXPIRES_MINUTES", 30);
}

export function getAdminUsername(): string | null {
  return process.env.ADMIN_USERNAME ?? null;
}

export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD ?? null;
}

export function getAdminSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "admin-session-fallback-secret"
  );
}

export function getAdminNotificationEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? null;
}

export function getEmailFrom(): string | null {
  return process.env.EMAIL_FROM ?? null;
}

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}
