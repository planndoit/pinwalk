import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { SERVICE_NAME } from "@/lib/constants";
import { getLocationConsentDocument } from "@/lib/legal/locationLegal";

export const metadata: Metadata = {
  title: "개인위치정보 수집·이용 동의",
  description: `${SERVICE_NAME} 개인위치정보 수집·이용 안내`,
};

export default function LocationConsentPage() {
  const document = getLocationConsentDocument();

  return (
    <LegalPageShell>
      <LegalDocumentView document={document} />
    </LegalPageShell>
  );
}
