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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("공지 목록 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({
    announcements: ((data ?? []) as Announcement[]).map(
      serializeAdminAnnouncement
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

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

  const published = isPublished === true;
  const now = new Date();
  const publishedAt = published ? now.toISOString() : null;
  const popupEndsAtValue =
    published && popupResult.value === null
      ? new Date(now.getTime() + ANNOUNCEMENT_POPUP_DEFAULT_DAYS * DAY_MS).toISOString()
      : popupResult.value;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .insert({
      title: titleResult.value,
      body: bodyResult.value,
      is_published: published,
      published_at: publishedAt,
      popup_ends_at: popupEndsAtValue,
    })
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("공지 등록에 실패했습니다.", 500);
  }

  return NextResponse.json({
    announcement: serializeAdminAnnouncement(data as Announcement),
  });
}
