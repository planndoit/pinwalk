import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { SERVICE_NAME } from "@/lib/constants";
import { getLocationTermsDocument } from "@/lib/legal/locationLegal";

export const metadata: Metadata = {
  title: "위치기반서비스 이용약관",
  description: `${SERVICE_NAME} 위치기반서비스 이용약관`,
};

export default function LocationTermsPage() {
  const document = getLocationTermsDocument();

  return (
    <LegalPageShell>
      <LegalDocumentView document={document} />
    </LegalPageShell>
  );
}
