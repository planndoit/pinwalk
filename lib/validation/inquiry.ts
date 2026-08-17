import {
  INQUIRY_CONTENT_MAX_LENGTH,
  INQUIRY_REPLY_MAX_LENGTH,
  INQUIRY_TITLE_MAX_LENGTH,
} from "@/lib/constants";

export function validateInquiryTitle(title: string): {
  valid: boolean;
  error?: string;
  value: string;
} {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: "제목을 입력해주세요.", value: "" };
  }
  if (trimmed.length > INQUIRY_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `제목은 ${INQUIRY_TITLE_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: "",
    };
  }
  return { valid: true, value: trimmed };
}

export function validateInquiryContent(content: string): {
  valid: boolean;
  error?: string;
  value: string;
} {
  const trimmed = content.trim();
  if (!trimmed) {
    return { valid: false, error: "내용을 입력해주세요.", value: "" };
  }
  if (trimmed.length > INQUIRY_CONTENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `내용은 ${INQUIRY_CONTENT_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: "",
    };
  }
  return { valid: true, value: trimmed };
}

export function validateInquiryReply(reply: string): {
  valid: boolean;
  error?: string;
  value: string;
} {
  const trimmed = reply.trim();
  if (!trimmed) {
    return { valid: false, error: "답변을 입력해주세요.", value: "" };
  }
  if (trimmed.length > INQUIRY_REPLY_MAX_LENGTH) {
    return {
      valid: false,
      error: `답변은 ${INQUIRY_REPLY_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: "",
    };
  }
  return { valid: true, value: trimmed };
}
