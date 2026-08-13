"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function LegalPageShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto min-h-full bg-white">
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-semibold text-blue-600 px-1 py-1"
          >
            뒤로
          </button>
        </header>
        <div className="px-5 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
