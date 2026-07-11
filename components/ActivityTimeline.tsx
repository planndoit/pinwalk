"use client";

import { formatActivityDate } from "@/lib/formatDate";
import type { TimelineEvent } from "@/types/ranking";

export default function ActivityTimeline({
  events,
  emptyText = "활동 내역이 없습니다.",
}: {
  events: TimelineEvent[];
  emptyText?: string;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{emptyText}</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const amount =
          event.amount == null || Number.isNaN(Number(event.amount))
            ? null
            : Number(event.amount);

        const dotColor = (() => {
          if (event.event_type === "conquered_by") return "bg-rose-500";
          if (event.event_type === "conquer") {
            return event.title === "점령 성공" ? "bg-blue-500" : "bg-rose-500";
          }
          if (event.title === "깃발 꽂기") return "bg-blue-500";
          if (amount != null && amount > 0) return "bg-emerald-500";
          if (amount != null && amount < 0) return "bg-rose-500";
          return "bg-gray-400";
        })();

        return (
          <div key={`${event.event_type}-${event.id}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-2 ${dotColor}`} />
              {index < events.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 my-1" />
              )}
            </div>
            <div className="flex-1 pb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  {formatActivityDate(event.created_at)}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {event.description}
                  </p>
                )}
              </div>
              {amount != null && (
                <span
                  className={`text-sm font-bold tabular-nums whitespace-nowrap mt-4 ${
                    amount > 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {amount > 0
                    ? `+${amount.toLocaleString()}`
                    : amount.toLocaleString()}
                  P
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
