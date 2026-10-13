import type { ReactNode } from "react";

export default function AnnouncementCard({
  title,
  body,
  footer,
}: {
  title: string;
  body: string;
  footer: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl max-h-[80dvh] flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-blue-600">공지</p>
        <h2 className="mt-1 text-base font-bold text-gray-900 break-words">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4 overflow-y-auto overscroll-contain">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
          {body}
        </p>
      </div>
      <div className="px-5 py-4 border-t border-gray-100">{footer}</div>
    </div>
  );
}
