"use client";

export interface MemberTrendPoint {
  date: string;
  signups: number;
  totalMembers: number;
}

function formatShortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default function MemberTrendChart({
  data,
}: {
  data: MemberTrendPoint[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-10 text-center">추세 데이터가 없습니다.</p>
    );
  }

  const width = 640;
  const height = 260;
  const padding = { top: 20, right: 48, bottom: 36, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxSignups = Math.max(1, ...data.map((d) => d.signups));
  const minTotal = Math.min(...data.map((d) => d.totalMembers));
  const maxTotal = Math.max(...data.map((d) => d.totalMembers));
  const totalSpan = Math.max(1, maxTotal - minTotal);

  const barGap = 0.35;
  const barSlot = plotW / data.length;
  const barWidth = barSlot * (1 - barGap);

  const points = data.map((d, i) => {
    const x = padding.left + barSlot * i + barSlot / 2;
    const y =
      padding.top +
      plotH -
      ((d.totalMembers - minTotal) / totalSpan) * plotH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const yTicks = 4;
  const signupTicks = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxSignups * i) / yTicks)
  );
  const totalTicks = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minTotal + (totalSpan * i) / yTicks)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/80" />
          오늘 가입(막대)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-emerald-600 rounded" />
          전체 회원(선)
        </span>
        <span className="text-gray-400">최근 {data.length}일</span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[480px] h-auto"
          role="img"
          aria-label="회원 추세 그래프"
        >
          {signupTicks.map((tick, i) => {
            const y = padding.top + plotH - (tick / maxSignups) * plotH;
            return (
              <g key={`sg-${tick}-${i}`}>
                <line
                  x1={padding.left}
                  x2={padding.left + plotW}
                  y1={y}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-gray-400"
                  fontSize="10"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const barH = (d.signups / maxSignups) * plotH;
            const x = padding.left + barSlot * i + (barSlot - barWidth) / 2;
            const y = padding.top + plotH - barH;
            return (
              <rect
                key={d.date}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, d.signups > 0 ? 2 : 0)}
                rx="2"
                className="fill-blue-500/80"
              >
                <title>
                  {d.date}: 가입 {d.signups}명 / 전체 {d.totalMembers}명
                </title>
              </rect>
            );
          })}

          <path
            d={linePath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p) => (
            <circle
              key={`pt-${p.date}`}
              cx={p.x}
              cy={p.y}
              r="3"
              className="fill-emerald-600"
            >
              <title>
                {p.date}: 전체 {p.totalMembers}명
              </title>
            </circle>
          ))}

          {totalTicks.map((tick, i) => {
            const y = padding.top + plotH - ((tick - minTotal) / totalSpan) * plotH;
            return (
              <text
                key={`tt-${tick}-${i}`}
                x={padding.left + plotW + 8}
                y={y + 3}
                className="fill-emerald-700/70"
                fontSize="10"
              >
                {tick}
              </text>
            );
          })}

          {data.map((d, i) => {
            if (data.length > 10 && i % 2 === 1) return null;
            const x = padding.left + barSlot * i + barSlot / 2;
            return (
              <text
                key={`lb-${d.date}`}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize="10"
              >
                {formatShortDate(d.date)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
