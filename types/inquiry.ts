import type { InquiryStatus } from "@/lib/constants";

export interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SerializedInquiry {
  id: string;
  userId: string;
  nickname: string | null;
  username: string | null;
  title: string;
  content: string;
  status: InquiryStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
