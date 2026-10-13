import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/lib/constants";

const ZONED_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function validateAnnouncementTitle(title: unknown): {
  valid: boolean;
  error?: string;
  value: string;
} {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) {
    return { valid: false, error: "제목을 입력해주세요.", value: "" };
  }
  if (trimmed.length > ANNOUNCEMENT_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `제목은 ${ANNOUNCEMENT_TITLE_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: "",
    };
  }
  return { valid: true, value: trimmed };
}

export function validateAnnouncementBody(body: unknown): {
  valid: boolean;
  error?: string;
  value: string;
} {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed) {
    return { valid: false, error: "본문을 입력해주세요.", value: "" };
  }
  if (trimmed.length > ANNOUNCEMENT_BODY_MAX_LENGTH) {
    return {
      valid: false,
      error: `본문은 ${ANNOUNCEMENT_BODY_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: "",
    };
  }
  return { valid: true, value: trimmed };
}

/** 팝업 종료 일시: 비우면 null, 값이 있으면 시간대가 포함된 ISO 문자열만 허용한다. */
export function validateAnnouncementPopupEndsAt(value: unknown): {
  valid: boolean;
  error?: string;
  value: string | null;
} {
  if (value == null || value === "") {
    return { valid: true, value: null };
  }
  if (typeof value !== "string" || !ZONED_DATETIME_PATTERN.test(value)) {
    return {
      valid: false,
      error: "팝업 종료 일시 형식이 올바르지 않습니다.",
      value: null,
    };
  }
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return {
      valid: false,
      error: "팝업 종료 일시 형식이 올바르지 않습니다.",
      value: null,
    };
  }
  return { valid: true, value: new Date(time).toISOString() };
}
