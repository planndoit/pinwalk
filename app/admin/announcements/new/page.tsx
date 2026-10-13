"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AnnouncementForm, {
  type AnnouncementFormValues,
} from "@/components/admin/AnnouncementForm";
import { AdminButton, AdminPageHeader } from "@/components/admin/AdminUi";
import { useSubmitLock } from "@/lib/useSubmitLock";

export default function AdminAnnouncementNewPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const { locked: saving, run } = useSubmitLock();

  const handleSubmit = (values: AnnouncementFormValues) => {
    void run(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "저장에 실패했습니다.");
        return "release";
      }
      router.push(`/admin/announcements/${data.announcement.id}`);
      return "keep";
    });
  };

  return (
    <div>
      <AdminPageHeader title="공지 작성" backHref="/admin/announcements" />
      <AnnouncementForm
        initial={null}
        saving={saving}
        message={message}
        onSubmit={handleSubmit}
        extraActions={
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            취소
          </AdminButton>
        }
      />
    </div>
  );
}
