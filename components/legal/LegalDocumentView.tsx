import type { LegalDocument } from "@/lib/legal/locationLegal";

export default function LegalDocumentView({
  document,
}: {
  document: LegalDocument;
}) {
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-extrabold text-gray-900">{document.title}</h1>
        <p className="text-xs text-gray-500">
          시행일 {document.effectiveDate} · 버전 {document.version}
        </p>
      </header>

          {document.sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={`${section.title}-${index}`}
                  className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
    </article>
  );
}
