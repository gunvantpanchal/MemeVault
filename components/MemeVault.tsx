"use client";

import React, {
  useState, useRef, useEffect, useCallback, useMemo, CSSProperties,
} from "react";
import Link from "next/link";
import {
  Search, Volume2, VolumeX, Square, Play,
  ThumbsUp, ThumbsDown, Download, Share2, Upload, X,
} from "lucide-react";
import { SYNTHS, getSynth } from "@/lib/synths";
import { getEngine } from "@/lib/audio";

interface Sound {
  id: string;
  name: string;
  category: string;
  dur?: string;
  kind: "file" | "synth";
  synthId?: string;
  url?: string;
  filename?: string;
  firebaseUrl?: string;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  plays?: number;
}

interface ReactionState {
  likes: number;
  dislikes: number;
  downloads: number;
  userLiked?: boolean;
  userDisliked?: boolean;
}

const CAT_META: Record<string, { emoji: string; color: string }> = {
  Trending:  { emoji: "🔥", color: "#ff4500" },
  Memes:     { emoji: "😂", color: "#8b5cf6" },
  Bollywood: { emoji: "🎬", color: "#f59e0b" },
  Anime:     { emoji: "🎌", color: "#ec4899" },
  Gaming:    { emoji: "🎮", color: "#10b981" },
  Viral:     { emoji: "📱", color: "#06b6d4" },
  FX:        { emoji: "💥", color: "#f97316" },
  Reactions: { emoji: "😮", color: "#a78bfa" },
  Alerts:    { emoji: "🚨", color: "#ef4444" },
  Game:      { emoji: "🕹️", color: "#22c55e" },
  Music:     { emoji: "🎵", color: "#e879f9" },
};
const getCat = (c?: string) => CAT_META[c ?? ""] ?? { emoji: "🔊", color: "#6366f1" };

const ANIM_DELAYS = ["0s", "0.1s", "0.2s", "0.15s", "0.05s", "0.25s"];

function WaveBars({ color, height = 20, count = 6 }: {
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

function RowWaveform({ soundName, isPlaying, color }: {
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

function fmt(n: number): string {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function parseDurMs(dur?: string): number {
  if (!dur) return 2800;
  const [m, s] = dur.split(":").map(Number);
  return ((m || 0) * 60 + (s || 0)) * 1000 + 300;
}

export default function MemeVault() {
  const [sounds, setSounds]       = useState<Sound[]>([]);
  const [source, setSource]       = useState("loading");
  const [query, setQuery]         = useState("");
  const [cat, setCat]             = useState("All");
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(0.8);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef   = useRef(0);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const useSynths = () => {
      if (cancelled) return;
      setSounds(SYNTHS.map((s) => ({
        id: s.id, name: s.name, category: s.category, dur: s.dur,
        kind: "synth" as const, synthId: s.id,
        likes: 0, dislikes: 0, downloads: 0, plays: 0,
      })));
      setSource("demo");
    };
    fetch("/api/sounds")
      .then((r) => {
        const src = r.headers.get("X-Sound-Source") || "local";
        return r.json().then((data) => ({ data, src }));
      })
      .then(({ data, src }: { data: Sound[]; src: string }) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setSounds(data.map((s) => ({ ...s, kind: "file" as const, url: s.firebaseUrl || s.url })));
          setSource(src);
        } else {
          useSynths();
        }
      })
      .catch(() => { if (!cancelled) useSynths(); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { getEngine().setVolume(volume, muted); }, [volume, muted]);

  const play = useCallback((s: Sound) => {
    const eng = getEngine();
    eng.ensure();
    if (playingId === s.id) {
      eng.stopAll();
      setPlayingId(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (s.kind === "file" && s.id) {
      const streamUrl = `/api/sounds/${s.id}/stream`;
      const directUrl = s.url;
      eng.playUrl(directUrl ?? streamUrl, directUrl ? streamUrl : undefined).catch(console.error);
    } else if (s.kind === "synth" && s.synthId) {
      const def = getSynth(s.synthId);
      if (def) eng.playSynth(def.make);
    }
    const durMs = parseDurMs(s.dur);
    liveRef.current = performance.now() + durMs;
    setPlayingId(s.id);
    if (s.kind === "file") {
      fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
      setReactions((r) => ({
        ...r,
        [s.id]: { ...r[s.id], downloads: (r[s.id]?.downloads ?? s.downloads ?? 0) + 1 },
      }));
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setPlayingId((id) => (id === s.id ? null : id)),
      durMs,
    );
  }, [playingId]);

  const stopAll = useCallback(() => {
    getEngine().stopAll();
    setPlayingId(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const like = useCallback(async (s: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reactions[s.id]?.userLiked) return;
    setReactions((r) => ({
      ...r,
      [s.id]: {
        ...r[s.id], userLiked: true, userDisliked: false,
        likes: (r[s.id]?.likes ?? s.likes ?? 0) + 1,
        dislikes: r[s.id]?.userDisliked
          ? Math.max(0, (r[s.id]?.dislikes ?? s.dislikes ?? 0) - 1)
          : (r[s.id]?.dislikes ?? s.dislikes ?? 0),
        downloads: r[s.id]?.downloads ?? s.downloads ?? 0,
      },
    }));
    if (s.kind !== "synth") {
      const res = await fetch(`/api/sounds/${s.id}/like`, { method: "POST" }).catch(() => null);
      if (res?.ok) {
        const data = await res.json() as { likes: number; dislikes: number };
        setReactions((r) => ({ ...r, [s.id]: { ...r[s.id], likes: data.likes, dislikes: data.dislikes } }));
      }
    }
  }, [reactions]);

  const dislike = useCallback(async (s: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reactions[s.id]?.userDisliked) return;
    setReactions((r) => ({
      ...r,
      [s.id]: {
        ...r[s.id], userDisliked: true, userLiked: false,
        dislikes: (r[s.id]?.dislikes ?? s.dislikes ?? 0) + 1,
        likes: r[s.id]?.userLiked
          ? Math.max(0, (r[s.id]?.likes ?? s.likes ?? 0) - 1)
          : (r[s.id]?.likes ?? s.likes ?? 0),
        downloads: r[s.id]?.downloads ?? s.downloads ?? 0,
      },
    }));
    if (s.kind !== "synth") {
      const res = await fetch(`/api/sounds/${s.id}/dislike`, { method: "POST" }).catch(() => null);
      if (res?.ok) {
        const data = await res.json() as { likes: number; dislikes: number };
        setReactions((r) => ({ ...r, [s.id]: { ...r[s.id], likes: data.likes, dislikes: data.dislikes } }));
      }
    }
  }, [reactions]);

  const downloadFile = useCallback((s: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.kind !== "file" || !s.id) return;
    const a = document.createElement("a");
    a.href = `/api/sounds/${s.id}/file`;
    a.download = s.filename || `${s.name.replace(/[^a-z0-9]/gi, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setReactions((r) => ({
      ...r,
      [s.id]: { ...r[s.id], downloads: (r[s.id]?.downloads ?? s.downloads ?? 0) + 1 },
    }));
  }, []);

  const share = useCallback((s: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: s.name, text: `"${s.name}" — MemeMusic` }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(
        `${window.location.origin}?q=${encodeURIComponent(s.name)}`,
      ).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "Escape") stopAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopAll]);

  useEffect(() => {
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#ff2d87");
      grad.addColorStop(0.45, "#7c3aed");
      grad.addColorStop(1, "#06b6d4");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      const analyser = getEngine().analyser;
      const live = performance.now() < liveRef.current;
      if (analyser && live) {
        const buf = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(buf);
        const step = buf.length / w;
        for (let x = 0; x < w; x++) {
          const v = (buf[Math.floor(x * step)] - 128) / 128;
          x === 0 ? ctx.moveTo(x, h / 2 + v * (h / 2) * 0.85) : ctx.lineTo(x, h / 2 + v * (h / 2) * 0.85);
        }
        ctx.globalAlpha = 1;
      } else {
        const tt = performance.now() / 900;
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x / 32 + tt) * 3.5 * Math.sin(tt * 0.6);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.35;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cats = useMemo(() => {
    const set = new Set(sounds.map((s) => s.category).filter(Boolean));
    return ["All", "Trending", ...Array.from(set).filter((c) => c !== "Trending")];
  }, [sounds]);

  const list = useMemo(() => {
    let arr = sounds;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((s) => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
    }
    if (cat === "All") return arr;
    if (cat === "Trending")
      return [...arr].sort(
        (a, b) =>
          (reactions[b.id]?.downloads ?? b.downloads ?? b.plays ?? 0) -
          (reactions[a.id]?.downloads ?? a.downloads ?? a.plays ?? 0),
      );
    return arr.filter((s) => s.category === cat);
  }, [sounds, query, cat, reactions]);

  const playingSound = sounds.find((s) => s.id === playingId);
  const playCatMeta  = playingSound ? getCat(playingSound.category) : null;

  const getLikes     = (s: Sound) => reactions[s.id]?.likes     ?? s.likes     ?? 0;
  const getDislikes  = (s: Sound) => reactions[s.id]?.dislikes  ?? s.dislikes  ?? 0;
  const getDownloads = (s: Sound) => reactions[s.id]?.downloads ?? s.downloads ?? s.plays ?? 0;
  const hasLiked     = (id: string) => !!reactions[id]?.userLiked;
  const hasDisliked  = (id: string) => !!reactions[id]?.userDisliked;

  return (
    <div className="appRoot">

      {/* ── Sidebar ── */}
      <aside className="appSidebar">
        <div style={S.logo}>
          <span style={{ color: "#ff2d87" }}>meme</span>
          <span style={{ color: "#fff" }}>music</span>
          <span style={{ color: "#ff2d87", fontSize: 11, opacity: 0.6, marginLeft: 2 }}>.fun</span>
        </div>

        <div style={S.divider} />

        <nav style={S.sidebarNav}>
          {cats.map((c) => {
            const m = getCat(c);
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`sidebarItem${active ? " sidebarItemActive" : ""}`}
                style={active ? { color: m.color } : undefined}
              >
                <span className="sidebarEmoji">{c === "All" ? "🎵" : m.emoji}</span>
                <span>{c === "All" ? "All Sounds" : c}</span>
                {active && <span className="sidebarDot" style={{ background: m.color }} />}
              </button>
            );
          })}
        </nav>

        <div style={S.sidebarFooter}>
          <Link href="/upload" className="sidebarUploadBtn">
            <Upload size={14} /> Upload Sound
          </Link>
          <Link href="/blog" style={S.blogLink}>
            📝 Creator Blog
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="appMain">

        {/* Header */}
        <header className="appHeader">
          <div className="mobileLogo">
            <span style={{ color: "#ff2d87" }}>meme</span>
            <span>music</span>
            <span style={{ color: "#ff2d87", fontSize: 12, opacity: 0.6, marginLeft: 2 }}>.fun</span>
          </div>

          <div className="headerRow">
            <div className="searchWrap">
              <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meme sounds…"
                style={S.searchInput}
              />
              {query && (
                <button onClick={() => setQuery("")} style={S.iconBtn}><X size={13} /></button>
              )}
            </div>

            <div style={S.controls}>
              <button onClick={stopAll} style={S.ctrlBtn} title="Stop all (Esc)">
                <Square size={13} strokeWidth={3} fill="currentColor" />
              </button>
              <button onClick={() => setMuted((m) => !m)} style={S.ctrlBtn} title={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="volSliderWrap">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                  style={S.volSlider}
                  aria-label="Volume"
                />
              </div>
              <Link href="/upload" className="uploadBtn">
                <Upload size={13} /> Upload
              </Link>
            </div>
          </div>

          {/* Mobile category chips */}
          <div className="mobileChips">
            {cats.map((c) => {
              const m = getCat(c);
              const active = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="chip"
                  style={active ? { color: m.color, borderColor: m.color, background: `${m.color}15` } : undefined}
                >
                  {c !== "All" && <span style={{ marginRight: 3 }}>{m.emoji}</span>}{c}
                </button>
              );
            })}
          </div>
        </header>

        {/* Sound list */}
        <main>
          {source === "loading" && (
            <div style={S.loadState}>
              <WaveBars color="var(--muted)" height={22} />
              Loading sounds…
            </div>
          )}

          <div className="soundList">
            {list.map((s) => {
              const meta      = getCat(s.category);
              const isPlaying = playingId === s.id;
              const liked     = hasLiked(s.id);
              const disliked  = hasDisliked(s.id);

              return (
                <div
                  key={s.id}
                  className={`soundRow${isPlaying ? " isPlaying" : ""}`}
                  onClick={() => play(s)}
                  onPointerEnter={() => {
                    if (s.kind === "file") {
                    const streamUrl = `/api/sounds/${s.id}/stream`;
                    getEngine().preload(s.url ?? streamUrl, s.url ? streamUrl : undefined);
                  }
                  }}
                  style={isPlaying ? {
                    borderColor: `${meta.color}40`,
                    background: `${meta.color}0a`,
                    boxShadow: `0 0 0 1px ${meta.color}25, 0 8px 32px ${meta.color}15`,
                  } : undefined}
                >
                  {/* Avatar */}
                  <div
                    className="rowAvatar"
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

                  {/* Name + category */}
                  <div className="rowInfo">
                    <div className="rowName" style={isPlaying ? { color: meta.color } : undefined}>
                      {s.name}
                    </div>
                    <div className="rowCat" style={{ color: meta.color }}>
                      <span>{meta.emoji}</span>
                      <span>{s.category}</span>
                    </div>
                  </div>

                  {/* Waveform */}
                  <div className="rowWaveform">
                    <RowWaveform soundName={s.name} isPlaying={isPlaying} color={meta.color} />
                  </div>

                  {/* Duration */}
                  {s.dur && <span className="rowDur">{s.dur}</span>}

                  {/* Actions */}
                  <div className="rowActions" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => like(s, e)}
                      className="actionBtn"
                      style={liked ? { color: "#22c55e" } : undefined}
                      title="Like"
                    >
                      <ThumbsUp size={13} fill={liked ? "currentColor" : "none"} />
                      {getLikes(s) > 0 && <span className="actionCount">{fmt(getLikes(s))}</span>}
                    </button>
                    <button
                      onClick={(e) => dislike(s, e)}
                      className="actionBtn hideOnMobile"
                      style={disliked ? { color: "#ef4444" } : undefined}
                      title="Dislike"
                    >
                      <ThumbsDown size={13} fill={disliked ? "currentColor" : "none"} />
                    </button>
                    <button onClick={(e) => share(s, e)} className="actionBtn hideOnMobile" title="Share">
                      <Share2 size={13} />
                    </button>
                    {s.kind === "file" && (
                      <button onClick={(e) => downloadFile(s, e)} className="dlBtn" title="Download MP3">
                        <Download size={13} style={{ color: "#fff" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {list.length === 0 && source !== "loading" && (
              <div style={S.emptyState}>
                {query
                  ? <><b>&ldquo;{query}&rdquo;</b> — no results</>
                  : <>No sounds yet. <Link href="/upload" style={{ color: "var(--accent)", fontWeight: 700 }}>Upload one →</Link></>}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom player ── */}
      {playingSound && playCatMeta && (
        <div className="playerBar" style={{ borderTopColor: `${playCatMeta.color}30` }}>
          <div className="playerAvatar" style={{ background: `${playCatMeta.color}25` }}>
            <span style={{ fontSize: 22 }}>{playCatMeta.emoji}</span>
          </div>
          <div className="playerInfo">
            <div className="playerName" style={{ color: playCatMeta.color }}>{playingSound.name}</div>
            <div className="playerCat">{playingSound.category}</div>
          </div>
          <div className="playerCanvas">
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <button
            onClick={stopAll}
            className="playerStop"
            style={{ background: playCatMeta.color }}
            title="Stop (Esc)"
          >
            <Square size={13} fill="#fff" style={{ color: "#fff" }} />
          </button>
        </div>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  logo: {
    display: "flex",
    alignItems: "baseline",
    gap: 1,
    padding: "24px 20px 16px",
    fontFamily: "var(--font-display)",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: "var(--border)",
    margin: "0 16px 10px",
  },
  sidebarNav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 10px",
    overflowY: "auto",
  },
  sidebarFooter: {
    padding: "16px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  blogLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text2)",
    border: "1px solid var(--border)",
    background: "transparent",
    transition: "all 0.15s",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    width: 0,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text)",
    fontSize: 14.5,
    fontFamily: "inherit",
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    cursor: "pointer",
    padding: 2,
    display: "grid",
    placeItems: "center",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 10,
    cursor: "pointer",
  },
  volSlider: { width: 72, cursor: "pointer" },
  loadState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    color: "var(--muted)",
    fontSize: 15,
    padding: "80px 20px",
  },
  emptyState: {
    textAlign: "center",
    color: "var(--muted)",
    padding: "60px 20px",
    fontSize: 15,
    lineHeight: 1.7,
  },
};
