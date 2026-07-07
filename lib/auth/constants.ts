export const AUTH_EMAIL_DOMAIN = "pinwalk.auth";
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 6;
export const NICKNAME_MAX_LENGTH = 20;
export const AVATAR_MAX_BYTES = 50 * 1024;
export const SESSION_IDLE_MS = 3 * 24 * 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = "pinwalk_last_activity";

export function usernameToAuthEmail(username: string): string {
  return `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
