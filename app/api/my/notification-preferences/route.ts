import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/preferences";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const preferences = await getOrCreateNotificationPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const updates: Record<string, boolean> = {};

  const fields = [
    "pushEnabled",
    "crewEnabled",
    "gameEnabled",
    "supportEnabled",
    "promotionEnabled",
    "pointsEnabled",
    "reminderEnabled",
  ] as const;

  for (const field of fields) {
    if (typeof body[field] === "boolean") {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("변경할 설정이 없습니다.");
  }

  try {
    const preferences = await updateNotificationPreferences(user.id, updates);
    return NextResponse.json({ preferences });
  } catch {
    return jsonError("알림 설정 저장에 실패했습니다.", 500);
  }
}
