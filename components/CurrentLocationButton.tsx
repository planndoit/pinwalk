"use client";

interface CurrentLocationButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export default function CurrentLocationButton({
  onClick,
  loading,
}: CurrentLocationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="absolute right-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-20 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
      aria-label="현재 위치로 이동"
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-blue-600"
        >
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="1.5" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22.5" y2="12" />
        </svg>
      )}
    </button>
  );
}
