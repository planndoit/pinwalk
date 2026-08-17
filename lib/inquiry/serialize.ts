import type { Inquiry, SerializedInquiry } from "@/types/inquiry";

export function serializeInquiry(
  row: Inquiry & {
    nickname?: string | null;
    username?: string | null;
  }
): SerializedInquiry {
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname ?? null,
    username: row.username ?? null,
    title: row.title,
    content: row.content,
    status: row.status,
    adminReply: row.admin_reply,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
