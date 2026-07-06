import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORIES = [
  { emoji: "🔥", label: "Trending",  color: "#ff4500" },
  { emoji: "🎬", label: "Bollywood", color: "#f59e0b" },
  { emoji: "🎌", label: "Anime",     color: "#ec4899" },
  { emoji: "🎮", label: "Gaming",    color: "#10b981" },
  { emoji: "📱", label: "Viral",     color: "#06b6d4" },
  { emoji: "😂", label: "Memes",     color: "#8b5cf6" },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#060610",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow blobs */}
        <div style={{
          position: "absolute", top: -120, left: -80,
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,45,135,0.18) 0%, transparent 70%)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -100, right: -60,
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", top: 200, right: 300,
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          height: "100%",
          position: "relative",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg, #ff2d87, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(255,45,135,0.4)",
            }}>
              <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, fontFamily: "sans-serif" }}>M</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ color: "#ff2d87", fontSize: 32, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: "-1px" }}>meme</span>
              <span style={{ color: "#fff",    fontSize: 32, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: "-1px" }}>music</span>
              <span style={{ color: "rgba(255,45,135,0.6)", fontSize: 18, fontWeight: 600, fontFamily: "sans-serif", marginLeft: 2 }}>.fun</span>
            </div>
          </div>

          {/* Main headline */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}>
            <div style={{
              fontSize: 72,
              fontWeight: 900,
              fontFamily: "sans-serif",
              letterSpacing: "-3px",
              lineHeight: 1.0,
              color: "#fff",
            }}>
              The #1 Meme
            </div>
            <div style={{
              fontSize: 72,
              fontWeight: 900,
              fontFamily: "sans-serif",
              letterSpacing: "-3px",
              lineHeight: 1.0,
              background: "linear-gradient(90deg, #ff2d87, #7c3aed)",
              color: "transparent",
              backgroundClip: "text",
              display: "flex",
            }}>
              Soundboard
            </div>
            <div style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.55)",
              fontFamily: "sans-serif",
              fontWeight: 400,
              marginTop: 8,
              letterSpacing: "-0.3px",
            }}>
              3,000+ sounds · Instant playback · Free MP3 download · No sign-up
            </div>
          </div>

          {/* Category pills row */}
          <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: `${cat.color}18`,
                  border: `1.5px solid ${cat.color}40`,
                }}
              >
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ color: cat.color, fontSize: 15, fontWeight: 700, fontFamily: "sans-serif" }}>{cat.label}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right side wave bars decoration */}
        <div style={{
          position: "absolute",
          right: 72,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 200,
        }}>
          {[60, 100, 140, 80, 160, 110, 70, 130, 90, 150, 75, 120].map((h, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: h,
                borderRadius: 6,
                background: `linear-gradient(180deg, #ff2d87 0%, #7c3aed 100%)`,
                opacity: 0.3 + (i % 3) * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
