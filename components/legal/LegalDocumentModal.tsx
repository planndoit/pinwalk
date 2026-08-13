"use client";

import { useEffect } from "react";
import LegalDocumentView from "./LegalDocumentView";
import type { LegalDocument } from "@/lib/legal/locationLegal";

export default function LegalDocumentModal({
  open,
  document,
  onClose,
}: {
  open: boolean;
  document: LegalDocument | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !document) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 pr-4">
            {document.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <LegalDocumentView document={document} />
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
