import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  getAdminPassword,
  getAdminSessionSecret,
  getAdminUsername,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_HASH_KEY = "admin_password_hash";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
  } catch {
    return false;
  }
}

async function getStoredPasswordHash(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", PASSWORD_HASH_KEY)
    .maybeSingle();
  return data?.value ?? null;
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = await getStoredPasswordHash();
  if (storedHash) {
    return verifyPassword(password, storedHash);
  }
  const envPassword = getAdminPassword();
  return envPassword !== null && password === envPassword;
}

function signToken(exp: number): string {
  const payload = `admin:${exp}`;
  const signature = createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !payload.startsWith("admin:")) return false;
  const exp = Number.parseInt(payload.slice("admin:".length), 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const envUsername = getAdminUsername();
  if (!envUsername || !getAdminPassword()) {
    return { success: false, error: "관리자 계정이 설정되지 않았습니다." };
  }

  if (username !== envUsername) {
    return { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    return { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const exp = Date.now() + SESSION_TTL_MS;
  const token = signToken(exp);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) {
    return { success: false, error: "새 비밀번호는 8자 이상이어야 합니다." };
  }

  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) {
    return { success: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("admin_settings").upsert(
    {
      key: PASSWORD_HASH_KEY,
      value: hashPassword(newPassword),
      updated_at: now,
    },
    { onConflict: "key" }
  );

  if (error) {
    return { success: false, error: "비밀번호 변경에 실패했습니다." };
  }

  return { success: true };
}
