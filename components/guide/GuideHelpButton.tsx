"use client";

const chipClassName =
  "box-border h-9 inline-flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-transparent";

export default function GuideHelpButton({
  onClick,
  label = "이용 가이드",
  variant = "chip",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  variant?: "chip" | "plain";
  className?: string;
}) {
  const baseLabel = (
    <span aria-hidden className="text-sm font-extrabold leading-none">
      ?
    </span>
  );

  if (variant === "plain") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 ${className}`}
      >
        {baseLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${chipClassName} w-9 shrink-0 text-gray-700 active:scale-95 transition-transform ${className}`}
    >
      {baseLabel}
    </button>
  );
}
