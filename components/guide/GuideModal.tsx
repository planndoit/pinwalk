"use client";

import { useEffect, useState } from "react";
import OverlayPortal from "@/components/layout/OverlayPortal";
import GuideContent from "@/components/guide/GuideContent";
import type { GuideScope, GuideSection } from "@/lib/guide/gameGuide";

export default function GuideModal({
  open,
  title,
  scope,
  onClose,
}: {
  open: boolean;
  title: string;
  scope: GuideScope;
  onClose: () => void;
}) {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    void fetch(`/api/guide?scope=${scope}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { sections?: GuideSection[] }) => {
        if (!cancelled) {
          setSections(data.sections ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, scope]);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 pr-4">{title}</h2>
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
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <GuideContent sections={sections} />
            )}
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
    </OverlayPortal>
  );
}
