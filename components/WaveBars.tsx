import React, { useMemo } from "react";

const ANIM_DELAYS = ["0s", "0.1s", "0.2s", "0.15s", "0.05s", "0.25s"];

export function WaveBars({ color, height = 20, count = 6 }: {
  color: string; height?: number; count?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      {ANIM_DELAYS.slice(0, count).map((d, i) => (
        <div key={i} className="waveBar"
          style={{ width: 2.5, height, background: color, borderRadius: 2, animationDelay: d }} />
      ))}
    </div>
  );
}

export function RowWaveform({ soundName, isPlaying, color }: {
  soundName: string; isPlaying: boolean; color: string;
}) {
  const heights = useMemo(() => {
    let h = 0;
    for (let i = 0; i < soundName.length; i++) h = (h * 31 + soundName.charCodeAt(i)) & 0x7fffffff;
    return Array.from({ length: 52 }, () => {
      h = (h * 1664525 + 1013904223) & 0x7fffffff;
      return 0.1 + (h / 0x7fffffff) * 0.9;
    });
  }, [soundName]);

  return (
    <div className="rowWaveform" style={{ display: "flex", alignItems: "center", gap: 1.5, height: 32 }}>
      {heights.map((ht, i) => (
        <div
          key={i}
          className={isPlaying ? "waveBar" : undefined}
          style={{
            width: 2,
            height: `${ht * 100}%`,
            background: isPlaying ? color : "rgba(255,255,255,0.10)",
            borderRadius: 2,
            flexShrink: 0,
            animationDelay: isPlaying ? `${(i % 6) * 0.1}s` : undefined,
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}
