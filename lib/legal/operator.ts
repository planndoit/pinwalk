import { SERVICE_NAME } from "@/lib/constants";

export type OperatorInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

/** 위치기반서비스 이용약관에 명시하는 사업자 연락처. env로만 설정한다. */
export function getOperatorInfo(): OperatorInfo {
  return {
    name: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || SERVICE_NAME,
    address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS?.trim() || "",
    phone: process.env.NEXT_PUBLIC_OPERATOR_PHONE?.trim() || "",
    email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL?.trim() || "",
  };
}

export function formatOperatorContactLines(operator: OperatorInfo): string[] {
  const lines = [
    `상호: ${operator.name}`,
    `주소: ${operator.address || "(미등록 — NEXT_PUBLIC_OPERATOR_ADDRESS 설정 필요)"}`,
    `전화번호: ${operator.phone || "(미등록 — NEXT_PUBLIC_OPERATOR_PHONE 설정 필요)"}`,
  ];
  if (operator.email) {
    lines.push(`이메일: ${operator.email}`);
  }
  return lines;
}
