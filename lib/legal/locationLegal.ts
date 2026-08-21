import { SERVICE_NAME } from "@/lib/constants";
import {
  formatOperatorContactLines,
  getOperatorInfo,
  type OperatorInfo,
} from "./operator";

/** 약관·동의서 개정 시 반드시 올린다. 가입 시 이 버전이 기록된다. */
export const LOCATION_LEGAL_VERSION = "2026-08-13";

/** 위치정보 이용·제공사실 확인자료 보유기간 (위치정보법 시행령 관행: 6개월). */
export const LOCATION_USAGE_LOG_RETENTION = "6개월";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: "location-terms" | "location-consent" | "privacy-policy";
  title: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
};

function buildLocationTerms(operator: OperatorInfo): LegalDocument {
  const contact = formatOperatorContactLines(operator);

  return {
    id: "location-terms",
    title: `${SERVICE_NAME} 위치기반서비스 이용약관`,
    version: LOCATION_LEGAL_VERSION,
    effectiveDate: "2026-08-13",
    sections: [
      {
        title: "제1조 (목적)",
        paragraphs: [
          `본 약관은 ${operator.name}(이하 "회사")가 제공하는 ${SERVICE_NAME} 위치기반서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
        ],
      },
      {
        title: "제2조 (사업자 정보)",
        paragraphs: contact,
      },
      {
        title: "제3조 (위치기반서비스의 내용)",
        paragraphs: [
          "서비스는 이용자의 단말기 위치정보(GPS 등)를 이용하여 다음 기능을 제공합니다.",
          "1. 지도 위 현재 위치 표시 및 지도 이동",
          "2. 현재 위치 인근에 깃발(핀) 생성·표시",
          "3. 깃발 점령 시도 시 이용자 위치가 대상 깃발 영향 반경 내인지 확인",
          "4. 랜덤 포인트·프리미엄 쿠폰 등 위치 기반 보상 생성·획득 가능 여부 확인",
          "5. 크루·랜드마크 등 위치와 연계된 지도 콘텐츠 표시",
        ],
      },
      {
        title: "제4조 (위치정보의 수집·이용·제공 요금 및 조건)",
        paragraphs: [
          "1. 위치정보의 수집·이용·제공에 대하여 회사는 별도의 요금을 부과하지 않습니다. 다만 이동통신사·단말기 설정에 따른 데이터 통신 요금은 이용자 부담입니다.",
          "2. 위치기반서비스 이용을 위해서는 단말기의 위치정보 이용 허용과, 본 약관 및 개인위치정보 수집·이용 동의가 필요합니다.",
          "3. 이용자가 위치정보 이용을 거부하거나 동의를 철회하면 위치 확인이 필요한 기능(깃발 생성·점령, 근접 보상 획득 등)을 이용할 수 없습니다.",
        ],
      },
      {
        title: "제5조 (개인위치정보의 보유목적 및 보유기간)",
        paragraphs: [
          "1. 보유목적: 제3조에 정한 위치기반서비스 제공, 부정 이용 방지, 고객 문의 대응, 관련 법령상 의무 이행.",
          "2. 보유기간: 개인위치정보는 수집·이용 목적을 달성하거나 이용자가 동의를 철회한 때, 또는 회원 탈퇴 시까지 보유·이용하며, 해당 시점 이후에는 지체 없이 파기합니다. 다만 관련 법령에 따라 보존이 필요한 경우 그 기간 동안 보관합니다.",
          `3. 위치정보 이용·제공사실 확인자료는 관련 법령에 따라 ${LOCATION_USAGE_LOG_RETENTION}간 보관합니다.`,
        ],
      },
      {
        title: "제6조 (위치정보 이용·제공사실 확인자료의 보유근거 및 보유기간)",
        paragraphs: [
          "1. 보유근거: 「위치정보의 보호 및 이용 등에 관한 법률」 제16조 및 관련 법령.",
          `2. 보유기간: ${LOCATION_USAGE_LOG_RETENTION}.`,
          "3. 확인자료에는 개인위치정보의 수집·이용·제공 일시, 이용자 식별정보, 제공받는 자(해당 시) 등이 포함될 수 있습니다.",
        ],
      },
      {
        title: "제7조 (개인위치정보의 제3자 제공)",
        paragraphs: [
          "1. 회사는 이용자의 사전 동의 없이 개인위치정보를 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있는 경우에는 예외로 합니다.",
          "2. 제3자에게 개인위치정보를 제공하는 경우, 제공받는 자·제공일시·제공목적을 즉시 이용자에게 통보합니다. 통보는 서비스 내 알림, 등록된 연락수단 또는 기타 합리적인 방법으로 할 수 있습니다.",
        ],
      },
      {
        title: "제8조 (개인위치정보주체 및 법정대리인의 권리와 행사방법)",
        paragraphs: [
          "1. 개인위치정보주체는 회사에 대하여 언제든지 개인위치정보 수집·이용·제공에 대한 동의의 전부 또는 일부를 철회할 수 있습니다.",
          "2. 개인위치정보주체는 개인위치정보의 이용·제공 일시, 제공받는 자, 이용·제공 목적 등 확인자료의 열람 또는 고지를 요구할 수 있으며, 오류가 있는 경우 정정을 요구할 수 있습니다.",
          "3. 권리 행사는 서비스 내 마이페이지의 위치정보 관련 메뉴 또는 제2조의 연락처로 요청할 수 있습니다. 회사는 정당한 사유가 없는 한 지체 없이 조치합니다.",
          "4. 만 14세 미만 아동의 개인위치정보를 이용하려면 「위치정보의 보호 및 이용 등에 관한 법률」 제25조에 따라 법정대리인의 동의가 필요합니다. 본 서비스는 만 14세 이상만 가입·이용할 수 있습니다.",
        ],
      },
      {
        title: "제9조 (개인위치정보의 파기)",
        paragraphs: [
          "회사는 다음 각 호의 경우 개인위치정보를 파기합니다.",
          "1. 위치기반서비스사업의 전부 또는 일부를 휴업·폐업하는 경우",
          "2. 개인위치정보의 수집·이용 또는 제공 목적을 달성한 경우",
          "3. 개인위치정보주체가 동의의 전부 또는 일부를 철회한 경우",
        ],
      },
      {
        title: "제10조 (약관의 게시 및 개정)",
        paragraphs: [
          "1. 회사는 본 약관을 서비스 초기화면 또는 연결화면을 통해 이용자가 쉽게 볼 수 있도록 게시합니다.",
          "2. 약관을 개정하는 경우 적용일자 및 개정 사유를 명시하여 적용일 7일 전부터 공지합니다. 이용자에게 불리한 변경은 30일 전부터 공지합니다.",
          `3. 현재 약관 버전: ${LOCATION_LEGAL_VERSION}`,
        ],
      },
    ],
  };
}

function buildLocationConsent(operator: OperatorInfo): LegalDocument {
  return {
    id: "location-consent",
    title: `${SERVICE_NAME} 개인위치정보 수집·이용 동의`,
    version: LOCATION_LEGAL_VERSION,
    effectiveDate: "2026-08-13",
    sections: [
      {
        title: "수집·이용 목적",
        paragraphs: [
          `${SERVICE_NAME} 위치기반서비스 제공(지도 현재 위치 표시, 깃발 생성·점령 가능 여부 확인, 랜덤 포인트·프리미엄 쿠폰 등 근접 보상 처리, 위치 연계 콘텐츠 표시), 부정 이용 방지, 고객 문의 대응.`,
        ],
      },
      {
        title: "수집 항목",
        paragraphs: [
          "단말기가 제공하는 위치정보(위도·경도 등 GPS 좌표). 서비스 이용 과정에서 깃발·랜덤 포인트 등 콘텐츠에 연결된 위치 좌표가 함께 저장될 수 있습니다.",
        ],
      },
      {
        title: "보유·이용 기간",
        paragraphs: [
          "수집·이용 목적 달성, 동의 철회 또는 회원 탈퇴 시까지. 위치정보 이용·제공사실 확인자료는 관련 법령에 따라 6개월간 보관합니다.",
        ],
      },
      {
        title: "동의 거부 권리 및 불이익",
        paragraphs: [
          "동의를 거부할 수 있습니다. 다만 거부 시 위치 확인이 필요한 핵심 기능(깃발 생성·점령, 근접 보상 획득 등)을 이용할 수 없습니다.",
        ],
      },
      {
        title: "사업자 연락처",
        paragraphs: formatOperatorContactLines(operator),
      },
    ],
  };
}

import { getPrivacyPolicyDocument } from "./privacyPolicy";

export function getLocationTermsDocument(): LegalDocument {
  return buildLocationTerms(getOperatorInfo());
}

export function getLocationConsentDocument(): LegalDocument {
  return buildLocationConsent(getOperatorInfo());
}

export function getLegalDocumentById(
  id: LegalDocument["id"]
): LegalDocument | null {
  if (id === "location-terms") return getLocationTermsDocument();
  if (id === "location-consent") return getLocationConsentDocument();
  if (id === "privacy-policy") return getPrivacyPolicyDocument();
  return null;
}
