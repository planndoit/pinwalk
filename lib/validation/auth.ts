import {
  NICKNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeUsername,
} from "@/lib/auth/constants";

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { valid: false, error: "아이디를 입력해주세요." };
  }

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `아이디는 ${USERNAME_MIN_LENGTH}자 이상이어야 합니다.`,
    };
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `아이디는 ${USERNAME_MAX_LENGTH}자 이하로 입력해주세요.`,
    };
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      valid: false,
      error: "아이디는 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.",
    };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "비밀번호를 입력해주세요." };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    };
  }

  return { valid: true };
}

export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  const trimmed = nickname.trim();

  if (!trimmed) {
    return { valid: false, error: "닉네임을 입력해주세요." };
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`,
    };
  }

  return { valid: true };
}
