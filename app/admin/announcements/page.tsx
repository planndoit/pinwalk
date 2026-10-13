"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import { formatKstDateTime } from "@/lib/announcements/kst";
import type { AdminAnnouncement } from "@/types/announcement";

function getPopupStatus(
  announcement: AdminAnnouncement,
  nowMs: number
): { label: string; className: string } {
  if (
    announcement.popupEndsAt &&
    new Date(announcement.popupEndsAt).getTime() <= nowMs
  ) {
    return { label: "종료", className: "bg-gray-100 text-gray-600" };
  }
  if (announcement.isPublished) {
    return { label: "진행 중", className: "bg-blue-50 text-blue-700" };
  }
  return { label: "없음", className: "bg-gray-100 text-gray-500" };
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/admin/announcements");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements ?? []);
        }
        setNowMs(Date.now());
        setLoading(false);
      })();
    });
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="공지 관리"
        description="공지 팝업과 고객센터 공지사항을 관리합니다."
        action={
          <Link href="/admin/announcements/new">
            <AdminButton type="button">공지 작성</AdminButton>
          </Link>
        }
      />
      <AdminCard>
        <AdminTable headers={["제목", "상태", "팝업", "공개일", "수정일", ""]}>
          {announcements.map((announcement) => {
            const popup = getPopupStatus(announcement, nowMs);
            return (
              <tr
                key={announcement.id}
                className="border-b border-gray-50 hover:bg-gray-50/50"
              >
                <td className="px-4 py-3 font-medium">{announcement.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      announcement.isPublished
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {announcement.isPublished ? "공개" : "비공개"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${popup.className}`}
                  >
                    {popup.label}
                  </span>
                  {announcement.popupEndsAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      ~ {formatKstDateTime(announcement.popupEndsAt)} (한국 시간)
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {announcement.publishedAt
                    ? `${formatKstDateTime(announcement.publishedAt)} (한국 시간)`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {`${formatKstDateTime(announcement.updatedAt)} (한국 시간)`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/announcements/${announcement.id}`}
                    className="text-blue-600 text-sm font-medium"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        {!loading && announcements.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            공지가 없습니다.
          </p>
        )}
      </AdminCard>
    </div>
  );
}
