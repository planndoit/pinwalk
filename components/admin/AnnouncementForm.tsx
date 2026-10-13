"use client";

import { useState } from "react";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import AnnouncementPopupFooter from "@/components/announcements/AnnouncementPopupFooter";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import {
  formatKstDateTime,
  kstDateTimeLocalToZoned,
  toKstDateTimeLocalValue,
} from "@/lib/announcements/kst";
import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_POPUP_DEFAULT_DAYS,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import type { AdminAnnouncement } from "@/types/announcement";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AnnouncementFormValues {
  title: string;
  body: string;
  isPublished: boolean;
  popupEndsAt: string | null;
}

export default function AnnouncementForm({
  initial,
  saving,
  message,
  onSubmit,
  extraActions,
}: {
  initial: AdminAnnouncement | null;
  saving: boolean;
  message: string | null;
  onSubmit: (values: AnnouncementFormValues) => void;
  extraActions?: React.ReactNode;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [popupEndsAtLocal, setPopupEndsAtLocal] = useState(
    initial?.popupEndsAt ? toKstDateTimeLocalValue(initial.popupEndsAt) : ""
  );

  const handlePublishedChange = (checked: boolean) => {
    setIsPublished(checked);
    if (checked && !initial?.publishedAt && !popupEndsAtLocal) {
      setPopupEndsAtLocal(
        toKstDateTimeLocalValue(
          new Date(Date.now() + ANNOUNCEMENT_POPUP_DEFAULT_DAYS * DAY_MS)
        )
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      body,
      isPublished,
      popupEndsAt: popupEndsAtLocal
        ? kstDateTimeLocalToZoned(popupEndsAtLocal)
        : null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
    >
      <div className="space-y-4">
        <AdminCard className="p-5 space-y-4">
          <AdminInput
            label={`제목 (${title.trim().length}/${ANNOUNCEMENT_TITLE_MAX_LENGTH})`}
            value={title}
            maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <AdminTextarea
            label={`본문 (${body.trim().length}/${ANNOUNCEMENT_BODY_MAX_LENGTH})`}
            rows={14}
            value={body}
            maxLength={ANNOUNCEMENT_BODY_MAX_LENGTH}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => handlePublishedChange(e.target.checked)}
            />
            공개 (고객센터 공지사항·팝업에 노출)
          </label>
          <div className="space-y-1">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <AdminInput
                  label="팝업 종료 일시 (한국 시간)"
                  type="datetime-local"
                  value={popupEndsAtLocal}
                  onChange={(e) => setPopupEndsAtLocal(e.target.value)}
                />
              </div>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => setPopupEndsAtLocal("")}
                disabled={!popupEndsAtLocal}
              >
                비우기
              </AdminButton>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              이 시각이 지나면 팝업이 뜨지 않습니다. 비워 두면 계속 뜹니다.
              처음 공개할 때 비어 있으면 공개 시각 + {ANNOUNCEMENT_POPUP_DEFAULT_DAYS}
              일로 채웁니다.
            </p>
          </div>
          {initial && (
            <dl className="text-xs text-gray-500 space-y-1">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0">공개일</dt>
                <dd>
                  {initial.publishedAt
                    ? `${formatKstDateTime(initial.publishedAt)} (한국 시간)`
                    : "-"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0">수정일</dt>
                <dd>{`${formatKstDateTime(initial.updatedAt)} (한국 시간)`}</dd>
              </div>
            </dl>
          )}
        </AdminCard>
        <div className="flex flex-wrap gap-2">
          <AdminButton type="submit" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </AdminButton>
          {extraActions}
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>

      <div className="lg:sticky lg:top-4">
        <p className="text-sm font-medium text-gray-700 mb-2">미리보기</p>
        <div className="rounded-xl bg-black/50 p-6 flex justify-center">
          <AnnouncementCard
            title={title.trim() || "제목"}
            body={body.trim() || "본문"}
            footer={
              <div className="pointer-events-none" aria-hidden>
                <AnnouncementPopupFooter
                  onClose={noop}
                  onHideToday={noop}
                  onHideForever={noop}
                />
              </div>
            }
          />
        </div>
      </div>
    </form>
  );
}

function noop() {}
