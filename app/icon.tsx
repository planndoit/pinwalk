import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#2563eb",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <line
            x1="5"
            y1="21"
            x2="5"
            y2="3"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M5 3 L19 7.5 L5 12 Z" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
