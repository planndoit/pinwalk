import {
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_MEMBERS_MAX,
  CREW_MEMBERS_MIN,
  CREW_NAME_MAX_LENGTH,
  isCrewAreaCode,
} from "@/lib/constants";
import { containsBlockedNicknameTerm } from "@/lib/validation/auth";

export function validateCrewName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "크루명을 입력해주세요." };
  }
  if (trimmed.length > CREW_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `크루명은 ${CREW_NAME_MAX_LENGTH}자 이하로 입력해주세요.`,
    };
  }
  if (containsBlockedNicknameTerm(trimmed)) {
    return {
      valid: false,
      error: "사용할 수 없는 크루명입니다. 다른 이름을 입력해주세요.",
    };
  }
  return { valid: true };
}

export function validateCrewDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
  value: string | null;
} {
  if (description == null || description.trim() === "") {
    return { valid: true, value: null };
  }
  const trimmed = description.trim();
  if (trimmed.length > CREW_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `소개는 ${CREW_DESCRIPTION_MAX_LENGTH}자 이하로 입력해주세요.`,
      value: null,
    };
  }
  return { valid: true, value: trimmed };
}

export function validateCrewAreaCode(areaCode: string): {
  valid: boolean;
  error?: string;
} {
  if (!isCrewAreaCode(areaCode)) {
    return { valid: false, error: "활동지역이 올바르지 않습니다." };
  }
  return { valid: true };
}

export function validateCrewMaxMembers(maxMembers: number): {
  valid: boolean;
  error?: string;
} {
  if (
    !Number.isInteger(maxMembers) ||
    maxMembers < CREW_MEMBERS_MIN ||
    maxMembers > CREW_MEMBERS_MAX
  ) {
    return {
      valid: false,
      error: `인원 상한은 ${CREW_MEMBERS_MIN}~${CREW_MEMBERS_MAX}명이어야 합니다.`,
    };
  }
  return { valid: true };
}
