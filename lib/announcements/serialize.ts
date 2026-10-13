import type { AdminAnnouncement, Announcement } from "@/types/announcement";

export function serializeAdminAnnouncement(row: Announcement): AdminAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    popupEndsAt: row.popup_ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
