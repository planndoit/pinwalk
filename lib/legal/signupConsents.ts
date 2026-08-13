import { LOCATION_LEGAL_VERSION } from "./locationLegal";

export type SignupConsentPayload = {
  agreeLocationTerms: boolean;
  agreeLocationCollection: boolean;
  confirmOver14: boolean;
  legalVersion: string;
};

export function validateSignupConsents(input: {
  agreeLocationTerms?: boolean;
  agreeLocationCollection?: boolean;
  confirmOver14?: boolean;
  legalVersion?: string;
}): { valid: true; data: SignupConsentPayload } | { valid: false; error: string } {
  if (input.confirmOver14 !== true) {
    return { valid: false, error: "만 14세 이상만 가입할 수 있습니다." };
  }

  if (input.agreeLocationTerms !== true) {
    return {
      valid: false,
      error: "위치기반서비스 이용약관에 동의해주세요.",
    };
  }

  if (input.agreeLocationCollection !== true) {
    return {
      valid: false,
      error: "개인위치정보 수집·이용에 동의해주세요.",
    };
  }

  const legalVersion =
    typeof input.legalVersion === "string" ? input.legalVersion.trim() : "";

  if (!legalVersion) {
    return { valid: false, error: "약관 버전 정보가 없습니다." };
  }

  if (legalVersion !== LOCATION_LEGAL_VERSION) {
    return {
      valid: false,
      error: "약관이 변경되었습니다. 최신 약관을 확인한 뒤 다시 동의해주세요.",
    };
  }

  return {
    valid: true,
    data: {
      agreeLocationTerms: true,
      agreeLocationCollection: true,
      confirmOver14: true,
      legalVersion,
    },
  };
}
