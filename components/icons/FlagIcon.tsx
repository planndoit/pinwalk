interface FlagIconProps {
  size?: number;
  color?: string;
  tier?: 100 | 300 | 500 | 1000;
  className?: string;
}

export default function FlagIcon({
  size = 20,
  color = "#ef4444",
  tier = 100,
  className,
}: FlagIconProps) {
  const accent =
    tier === 1000 ? "#f59e0b" : tier === 500 ? "#fbbf24" : color;

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
        y2={tier === 1000 ? 2.5 : 3}
        stroke={tier === 1000 ? accent : color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {tier === 100 && (
        <path d="M5 3 L19 7.5 L5 12 Z" fill={color} />
      )}
      {tier === 300 && (
        <>
          <path d="M5 3 L20 7 L5 11 Z" fill={color} />
          <path d="M7 6.2 L16.5 7.2 L7 9.5 Z" fill="rgba(0,0,0,0.18)" />
        </>
      )}
      {tier === 500 && (
        <>
          <path d="M5 3 L20 7 L5 11 Z" fill={color} />
          <path d="M8.5 5.8 L11 7 L8.5 8.2 L6 7 Z" fill={accent} />
        </>
      )}
      {tier === 1000 && (
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
