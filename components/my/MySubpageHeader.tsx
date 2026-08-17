"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function MySubpageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      className={`flex gap-2 mb-6 ${
        description ? "items-start" : "items-center"
      }`}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className="-ml-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200/70 active:bg-gray-200"
        aria-label="뒤로 가기"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold leading-9 text-gray-900">{title}</h1>
        {description ? (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
