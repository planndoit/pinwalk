interface FlagIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function FlagIcon({
  size = 20,
  color = "#ef4444",
  className,
}: FlagIconProps) {
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
        y2="3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M5 3 L19 7.5 L5 12 Z" fill={color} />
    </svg>
  );
}
