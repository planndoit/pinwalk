import type { FlagTier } from "@/lib/flagVisual";

interface FlagIconProps {
  size?: number;
  color?: string;
  tier?: FlagTier;
  className?: string;
}

export default function FlagIcon({
  size = 20,
  color = "#ef4444",
  tier = 100,
  className,
}: FlagIconProps) {
  const isGold = tier >= 900;
  const hasDiamond = tier >= 500;
  const hasInner = tier >= 300;
  const accent = isGold ? "#f59e0b" : hasDiamond ? "#fbbf24" : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <line
        x1="5"
        y1="21"
        x2="5"
        y2={isGold ? 2.5 : 3}
        stroke={isGold ? accent : color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {!hasInner && <path d="M5 3 L19 7.5 L5 12 Z" fill={color} />}
      {hasInner && !isGold && (
        <>
          <path d="M5 3 L20 7 L5 11 Z" fill={color} />
          {tier >= 300 && tier < 500 && (
            <path d="M7 6.2 L16.5 7.2 L7 9.5 Z" fill="rgba(0,0,0,0.18)" />
          )}
          {hasDiamond && (
            <path d="M8.5 5.8 L11 7 L8.5 8.2 L6 7 Z" fill={accent} />
          )}
          {tier >= 700 && tier < 900 && (
            <path d="M7 5.8 L17 7 L7 9.8 Z" fill="rgba(0,0,0,0.14)" />
          )}
        </>
      )}
      {isGold && (
        <>
          <path d="M5 3.5 L20 7 L5 11.5 Z" fill={accent} />
          <path
            d="M5 3.5 L20 7 L5 11.5 Z"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
          <path
            d="M4 2.2 L6.2 3.4 L8.2 2 L9.5 3.6 L5 4.2 L0.5 3.6 L1.8 2 L3.8 3.4 Z"
            fill="#fde68a"
            stroke={color}
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
