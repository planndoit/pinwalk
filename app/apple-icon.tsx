import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#2563eb",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24">
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
