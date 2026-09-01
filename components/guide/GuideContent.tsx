import type { GuideSection } from "@/lib/guide/gameGuide";

export default function GuideContent({
  sections,
}: {
  sections: GuideSection[];
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h3 className="text-sm font-extrabold text-gray-900">{section.title}</h3>
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-2 text-sm text-gray-600 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="text-sm text-gray-600 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
