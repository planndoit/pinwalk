import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonError } from "@/lib/api/auth";
import { serializeAdminAnnouncement } from "@/lib/announcements/serialize";
import { ANNOUNCEMENT_POPUP_DEFAULT_DAYS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateAnnouncementBody,
  validateAnnouncementPopupEndsAt,
  validateAnnouncementTitle,
} from "@/lib/validation/announcement";
import type { Announcement } from "@/types/announcement";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonError("공지 조회에 실패했습니다.", 500);
  }
  if (!data) {
    return jsonError("공지를 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({
    announcement: serializeAdminAnnouncement(data as Announcement),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { title, body: content, isPublished, popupEndsAt } = body as {
    title?: unknown;
    body?: unknown;
    isPublished?: unknown;
    popupEndsAt?: unknown;
  };

  const titleResult = validateAnnouncementTitle(title);
  if (!titleResult.valid) return jsonError(titleResult.error!);
  const bodyResult = validateAnnouncementBody(content);
  if (!bodyResult.valid) return jsonError(bodyResult.error!);
  const popupResult = validateAnnouncementPopupEndsAt(popupEndsAt);
  if (!popupResult.valid) return jsonError(popupResult.error!);

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("announcements")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return jsonError("공지 조회에 실패했습니다.", 500);
  }
  if (!existing) {
    return jsonError("공지를 찾을 수 없습니다.", 404);
  }

  const published = isPublished === true;
  const now = new Date();
  const firstPublish = published && !existing.published_at;
  const popupEndsAtValue =
    firstPublish && popupResult.value === null
      ? new Date(now.getTime() + ANNOUNCEMENT_POPUP_DEFAULT_DAYS * DAY_MS).toISOString()
      : popupResult.value;

  const updates: Record<string, unknown> = {
    title: titleResult.value,
    body: bodyResult.value,
    is_published: published,
    popup_ends_at: popupEndsAtValue,
    updated_at: now.toISOString(),
  };
  if (firstPublish) {
    updates.published_at = now.toISOString();
  }

  const { data, error } = await admin
    .from("announcements")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return jsonError("공지 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({
    announcement: serializeAdminAnnouncement(data as Announcement),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError("공지 삭제에 실패했습니다.", 500);
  }
  if (!data) {
    return jsonError("공지를 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({ message: "공지를 삭제했습니다." });
}
