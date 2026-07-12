import { PIN_TEXT_MAX_LENGTH } from "./constants";

const PHONE_PATTERN =
  /(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})|(\d{10,11})/;
const EXCESSIVE_SPECIAL_CHARS = /([^a-zA-Z0-9가-힣\s])\1{3,}/;

export function validatePinText(text: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = text.trim();

  if (!trimmed) {
    return { valid: false, error: "깃발 문구를 입력해주세요." };
  }

  if (trimmed.length > PIN_TEXT_MAX_LENGTH) {
    return {
      valid: false,
      error: `깃발 문구는 최대 ${PIN_TEXT_MAX_LENGTH}자까지 입력할 수 있어요.`,
    };
  }

  const lower = trimmed.toLowerCase();

  if (
    lower.includes("http") ||
    lower.includes("https") ||
    lower.includes("www")
  ) {
    return { valid: false, error: "링크는 입력할 수 없어요." };
  }

  if (PHONE_PATTERN.test(trimmed)) {
    return { valid: false, error: "전화번호는 입력할 수 없어요." };
  }

  if (EXCESSIVE_SPECIAL_CHARS.test(trimmed)) {
    return { valid: false, error: "특수문자를 과도하게 사용할 수 없어요." };
  }

  return { valid: true };
}
