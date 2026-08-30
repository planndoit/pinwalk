import type { ReactNode } from "react";

export default function MainTabHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="px-4 pt-safe pb-3 bg-white border-b border-gray-100">
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900 truncate">
            {title}
          </h1>
          {description ? (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex items-center gap-0.5 shrink-0">{action}</div>
        ) : null}
      </div>
    </header>
  );
}
