import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { SERVICE_NAME } from "@/lib/constants";
import { getPrivacyPolicyDocument } from "@/lib/legal/privacyPolicy";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${SERVICE_NAME} 개인정보처리방침`,
};

export default function PrivacyPolicyPage() {
  const document = getPrivacyPolicyDocument();

  return (
    <LegalPageShell>
      <LegalDocumentView document={document} />
    </LegalPageShell>
  );
}
