"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AnnouncementForm, {
  type AnnouncementFormValues,
} from "@/components/admin/AnnouncementForm";
import { AdminButton, AdminPageHeader } from "@/components/admin/AdminUi";
import { useSubmitLock } from "@/lib/useSubmitLock";
import type { AdminAnnouncement } from "@/types/announcement";

export default function AdminAnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [announcement, setAnnouncement] = useState<AdminAnnouncement | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const { locked: saving, run } = useSubmitLock();

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/announcements/${id}`);
    if (res.ok) {
      const data = await res.json();
      setAnnouncement(data.announcement);
    } else {
      setAnnouncement(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const handleSubmit = (values: AnnouncementFormValues) => {
    void run(async () => {
      setMessage(null);
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "저장에 실패했습니다.");
        return "release";
      }
      window.alert("저장되었습니다.");
      router.push("/admin/announcements");
      return "keep";
    });
  };

  const handleDelete = () => {
    if (!window.confirm("이 공지를 삭제할까요? 복구할 수 없습니다.")) {
      return;
    }
    void run(async () => {
      setMessage(null);
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "삭제에 실패했습니다.");
        return "release";
      }
      router.push("/admin/announcements");
      return "keep";
    });
  };

  if (!announcement) {
    return (
      <div>
        <AdminPageHeader title="공지 상세" backHref="/admin/announcements" />
        <p className="text-sm text-gray-500">
          {loading ? "로딩 중..." : "공지를 찾을 수 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="공지 상세" backHref="/admin/announcements" />
      <AnnouncementForm
        key={announcement.id}
        initial={announcement}
        saving={saving}
        message={message}
        onSubmit={handleSubmit}
        extraActions={
          <AdminButton
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={saving}
          >
            삭제
          </AdminButton>
        }
      />
    </div>
  );
}
