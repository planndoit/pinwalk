import {
  getAdminNotificationEmail,
  getEmailFrom,
  getResendApiKey,
} from "@/lib/env";

interface SendEmailOptions {
  subject: string;
  html: string;
}

export async function sendAdminNotificationEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const apiKey = getResendApiKey();
  const from = getEmailFrom();
  const to = getAdminNotificationEmail();

  if (!apiKey || !from || !to) {
    return { success: false, error: "이메일 설정이 완료되지 않았습니다." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { success: false, error: `이메일 발송 실패: ${body}` };
  }

  return { success: true };
}

export function buildPromotionRequestEmailHtml(data: {
  storeName: string;
  categoryName: string;
  contactName: string | null;
  contactPhone: string;
  contactEmail: string | null;
  placePhone: string;
  promoText: string;
  promoLink: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  requesterNickname: string;
}): string {
  const location =
    typeof data.lat === "number" && typeof data.lng === "number"
      ? `${data.lat}, ${data.lng}`
      : "-";

  return `
    <h2>프리미엄 홍보 요청이 접수되었습니다</h2>
    <ul>
      <li><strong>장소명:</strong> ${escapeHtml(data.storeName)}</li>
      <li><strong>카테고리:</strong> ${escapeHtml(data.categoryName)}</li>
      <li><strong>담당자:</strong> ${escapeHtml(data.contactName ?? "-")}</li>
      <li><strong>담당자 연락처:</strong> ${escapeHtml(data.contactPhone)}</li>
      <li><strong>이메일:</strong> ${escapeHtml(data.contactEmail ?? "-")}</li>
      <li><strong>장소 전화번호:</strong> ${escapeHtml(data.placePhone)}</li>
      <li><strong>도로명 주소:</strong> ${escapeHtml(data.address)}</li>
      <li><strong>홍보 문구:</strong> ${escapeHtml(data.promoText)}</li>
      <li><strong>홍보 링크:</strong> ${data.promoLink ? escapeHtml(data.promoLink) : "-"}</li>
      <li><strong>위치:</strong> ${location}</li>
      <li><strong>요청 회원:</strong> ${escapeHtml(data.requesterNickname)}</li>
    </ul>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
