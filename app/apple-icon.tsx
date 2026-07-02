import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #ff2d87 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: 80,
              fontWeight: 900,
              fontFamily: "sans-serif",
              letterSpacing: "-4px",
              lineHeight: 1,
            }}
          >
            M
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "sans-serif",
              letterSpacing: 1,
            }}
          >
            MUSIC
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
