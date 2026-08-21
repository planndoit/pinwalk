import { SERVICE_NAME } from "@/lib/constants";
import {
  formatOperatorContactLines,
  getOperatorInfo,
  type OperatorInfo,
} from "./operator";
import type { LegalDocument } from "./locationLegal";

export const PRIVACY_POLICY_VERSION = "2026-08-21";

function buildPrivacyPolicy(operator: OperatorInfo): LegalDocument {
  return {
    id: "privacy-policy",
    title: `${SERVICE_NAME} 개인정보처리방침`,
    version: PRIVACY_POLICY_VERSION,
    effectiveDate: "2026-08-21",
    sections: [
      {
        title: "1. 총칙",
        paragraphs: [
          `${operator.name}(이하 "회사")는 ${SERVICE_NAME} 서비스(웹·모바일 앱 포함, 이하 "서비스")를 제공함에 있어 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같이 개인정보처리방침을 둡니다.`,
        ],
      },
      {
        title: "2. 처리하는 개인정보 항목",
        paragraphs: [
          "회사는 서비스 제공을 위해 다음 정보를 처리할 수 있습니다.",
          "1. 회원 가입·로그인: 아이디, 비밀번호(암호화 저장), 닉네임, 프로필 이미지(선택)",
          "2. 서비스 이용: 포인트·깃발·점령·크루·문의 등 이용 기록, 기기 푸시 토큰(알림 허용 시)",
          "3. 위치정보: 단말기 GPS 등 위치좌표(지도·깃발·점령·근접 보상 등). 개인위치정보에 관한 상세는 위치기반서비스 이용약관 및 개인위치정보 수집·이용 안내를 따릅니다.",
          "4. 자동 수집: 접속 일시, 서비스 이용 로그, 오류 정보 등(운영·보안 목적)",
        ],
      },
      {
        title: "3. 개인정보의 처리 목적",
        paragraphs: [
          "1. 회원 식별, 로그인, 부정 이용 방지",
          "2. 위치 기반 게임·지도·깃발·점령·보상·크루 등 서비스 제공",
          "3. 고객 문의 대응, 공지·알림(푸시 포함) 전달",
          "4. 서비스 개선, 통계·오류 분석",
          "5. 관련 법령상 의무 이행",
        ],
      },
      {
        title: "4. 보유 및 이용 기간",
        paragraphs: [
          "원칙적으로 회원 탈퇴 시 또는 처리 목적 달성 시 지체 없이 파기합니다.",
          "다만 관련 법령에 따라 일정 기간 보관이 필요한 경우 그 기간 동안 보관할 수 있으며, 위치정보 이용·제공사실 확인자료는 관련 법령에 따라 6개월간 보관합니다.",
        ],
      },
      {
        title: "5. 개인정보의 제3자 제공",
        paragraphs: [
          "회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나, 서비스 제공에 필수적인 처리위탁(예: 클라우드 호스팅, 푸시 발송, 지도 API) 범위에서 필요한 경우 관련 업체에 위탁할 수 있습니다.",
          "주요 처리 위탁·연동 예: Supabase(인증·DB), Vercel(호스팅), Firebase Cloud Messaging(푸시), Naver Maps(지도 표시).",
        ],
      },
      {
        title: "6. 이용자의 권리",
        paragraphs: [
          "이용자는 개인정보의 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.",
          "회원 탈퇴는 앱·웹의 설정 메뉴에서 진행할 수 있으며, 그 밖의 요청은 아래 연락처로 할 수 있습니다.",
          "만 14세 미만은 본 서비스에 가입할 수 없습니다.",
        ],
      },
      {
        title: "7. 개인정보의 파기",
        paragraphs: [
          "보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 복구 불가능한 방법으로 파기합니다. 전자 파일은 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각합니다.",
        ],
      },
      {
        title: "8. 안전성 확보 조치",
        paragraphs: [
          "회사는 개인정보 보호를 위해 접근 권한 관리, 전송 구간 HTTPS 사용, 비밀번호 암호화 저장 등 합리적인 기술적·관리적 조치를 취합니다.",
        ],
      },
      {
        title: "9. 개인정보 보호 책임 및 문의",
        paragraphs: [
          "개인정보 관련 문의는 아래로 연락해 주세요.",
          ...formatOperatorContactLines(operator),
        ],
      },
      {
        title: "10. 방침의 변경",
        paragraphs: [
          "본 방침을 변경하는 경우 서비스 내 공지 또는 게시로 안내합니다.",
          `현재 버전: ${PRIVACY_POLICY_VERSION}`,
        ],
      },
    ],
  };
}

export function getPrivacyPolicyDocument(): LegalDocument {
  return buildPrivacyPolicy(getOperatorInfo());
}
