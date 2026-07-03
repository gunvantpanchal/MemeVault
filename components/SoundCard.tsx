import React from "react";
import Link from "next/link";
import { Play, Square, Download } from "lucide-react";
import { WaveBars } from "@/components/WaveBars";
import { getCat, type Sound } from "@/lib/soundMeta";

export function SoundCard({
  sound, isPlaying, onPlay, onHoverEnter, onHoverLeave, onDownload,
}: {
  sound: Sound;
  isPlaying: boolean;
  onPlay: (s: Sound) => void;
  onHoverEnter?: (s: Sound) => void;
  onHoverLeave?: () => void;
  onDownload?: (s: Sound, e: React.MouseEvent) => void;
}) {
  const meta = getCat(sound.category);

  return (
    <div
      className={`soundCard${isPlaying ? " isPlaying" : ""}`}
      onClick={() => onPlay(sound)}
      onPointerEnter={() => onHoverEnter?.(sound)}
      onPointerLeave={() => onHoverLeave?.()}
      style={isPlaying ? {
        borderColor: `${meta.color}40`,
        background: `${meta.color}0a`,
        boxShadow: `0 0 0 1px ${meta.color}25, 0 8px 24px ${meta.color}15`,
      } : undefined}
    >
      <div className="cardTop">
        <div
          className="cardAvatar"
          style={{
            background: `${meta.color}18`,
            border: `1.5px solid ${meta.color}${isPlaying ? "60" : "30"}`,
            boxShadow: isPlaying ? `0 0 14px ${meta.color}35` : undefined,
          }}
        >
          {isPlaying
            ? <WaveBars color={meta.color} height={16} count={5} />
            : <span style={{ fontSize: 20 }}>{meta.emoji}</span>}
          <div className="avatarOverlay">
            {isPlaying
              ? <Square size={12} fill="#fff" style={{ color: "#fff" }} />
              : <Play size={12} fill="#fff" style={{ color: "#fff", marginLeft: 2 }} />}
          </div>
        </div>

        <div className="cardInfo">
          {sound.kind === "file" ? (
            <Link
              href={`/sound/${sound.id}`}
              className="cardName"
              style={isPlaying ? { color: meta.color } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {sound.name}
            </Link>
          ) : (
            <div className="cardName" style={isPlaying ? { color: meta.color } : undefined}>
              {sound.name}
            </div>
          )}
          <div className="cardCat" style={{ color: meta.color }}>
            <span>{meta.emoji}</span>
            <span>{sound.category}</span>
          </div>
        </div>
      </div>

      <div className="cardFooter">
        {sound.dur ? <span className="cardDur">{sound.dur}</span> : <span />}
        {sound.kind === "file" && onDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(sound, e); }}
            className="cardDlBtn"
            title="Download MP3"
          >
            <Download size={12} style={{ color: "#fff" }} />
          </button>
        )}
      </div>
    </div>
  );
}
