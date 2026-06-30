"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search, Volume2, VolumeX, Square, Play,
  ThumbsUp, ThumbsDown, Download, Share2, Upload, X,
} from "lucide-react";
import { SYNTHS, getSynth } from "@/lib/synths";
import { getEngine } from "@/lib/audio";

// ── Category metadata ──────────────────────────────────────────────────────
const CAT_META = {
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
const getCat = (c) => CAT_META[c] ?? { emoji: "🔊", color: "#6366f1" };

// ── Waveform bars ──────────────────────────────────────────────────────────
const DELAYS = ["0s","0.1s","0.2s","0.15s","0.05s","0.25s","0.08s"];

function WaveBars({ color, height = 20, gap = 3, barW = 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, height }}>
      {DELAYS.map((d, i) => (
        <div key={i} className="waveBar"
          style={{ width: barW, height, background: color, borderRadius: 2, animationDelay: d }} />
      ))}
    </div>
  );
}
function WaveFlat({ color, height = 14 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      {[0.3,0.6,1,0.7,0.45,0.8,0.35].map((h, i) => (
        <div key={i} style={{ width: 2, height: h * height, background: color, borderRadius: 2, opacity: 0.3 }} />
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000)      return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
function parseDurMs(dur) {
  if (!dur) return 2800;
  const [m, s] = dur.split(":").map(Number);
  return ((m || 0) * 60 + (s || 0)) * 1000 + 300;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MemeVault() {
  const [sounds, setSounds]       = useState([]);
  const [source, setSource]       = useState("loading");
  const [query, setQuery]         = useState("");
  const [cat, setCat]             = useState("All");
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(0.8);
  const [playingId, setPlayingId] = useState(null);

  // reactions[id] = { likes, dislikes, downloads, userLiked, userDisliked }
  const [reactions, setReactions] = useState({});

  const canvasRef = useRef(null);
  const liveRef   = useRef(0);
  const rafRef    = useRef(null);
  const timerRef  = useRef(null);

  // ── Load sounds ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const useSynths = () => {
      if (cancelled) return;
      setSounds(SYNTHS.map((s) => ({
        id: s.id, name: s.name, category: s.category, dur: s.dur,
        kind: "synth", synthId: s.id,
        likes: 0, dislikes: 0, downloads: 0, plays: 0,
      })));
      setSource("demo");
    };

    fetch("/api/sounds")
      .then((r) => {
        const src = r.headers.get("X-Sound-Source") || "local";
        return r.json().then((data) => ({ data, src }));
      })
      .then(({ data, src }) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setSounds(data.map((s) => ({ ...s, kind: "file", url: s.firebaseUrl || s.url })));
          setSource(src); // "mongodb" | "local"
        } else {
          useSynths();
        }
      })
      .catch(() => { if (!cancelled) useSynths(); });

    return () => { cancelled = true; };
  }, []);

  // ── Volume ─────────────────────────────────────────────────────────────
  useEffect(() => { getEngine().setVolume(volume, muted); }, [volume, muted]);

  // ── Play ───────────────────────────────────────────────────────────────
  const play = useCallback((s) => {
    const eng = getEngine();
    eng.ensure();

    if (playingId === s.id) {
      eng.stopAll();
      setPlayingId(null);
      clearTimeout(timerRef.current);
      return;
    }

    if (s.kind === "file" && s.url) {
      eng.playUrl(s.url).catch(console.error);
    } else if (s.kind === "synth") {
      const def = getSynth(s.synthId);
      if (def) eng.playSynth(def.make);
    }

    const durMs = parseDurMs(s.dur);
    liveRef.current = performance.now() + durMs;
    setPlayingId(s.id);

    // Increment plays counter (fire-and-forget)
    if (s.kind === "file") {
      fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
      setReactions((r) => ({
        ...r,
        [s.id]: { ...r[s.id], downloads: (r[s.id]?.downloads ?? s.downloads ?? 0) + 1 },
      }));
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPlayingId((id) => id === s.id ? null : id), durMs);
  }, [playingId]);

  const stopAll = useCallback(() => {
    getEngine().stopAll();
    setPlayingId(null);
    clearTimeout(timerRef.current);
  }, []);

  // ── Like ───────────────────────────────────────────────────────────────
  const like = useCallback(async (s, e) => {
    e.stopPropagation();
    if (reactions[s.id]?.userLiked) return; // already liked

    // Optimistic update
    setReactions((r) => ({
      ...r,
      [s.id]: {
        ...r[s.id],
        userLiked: true,
        userDisliked: false,
        likes: (r[s.id]?.likes ?? s.likes ?? 0) + 1,
        // undo a previous dislike if any
        dislikes: r[s.id]?.userDisliked
          ? Math.max(0, (r[s.id]?.dislikes ?? s.dislikes ?? 0) - 1)
          : (r[s.id]?.dislikes ?? s.dislikes ?? 0),
      },
    }));

    if (s.kind !== "synth") {
      const res = await fetch(`/api/sounds/${s.id}/like`, { method: "POST" }).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setReactions((r) => ({ ...r, [s.id]: { ...r[s.id], likes: data.likes, dislikes: data.dislikes } }));
      }
    }
  }, [reactions]);

  // ── Dislike ────────────────────────────────────────────────────────────
  const dislike = useCallback(async (s, e) => {
    e.stopPropagation();
    if (reactions[s.id]?.userDisliked) return;

    setReactions((r) => ({
      ...r,
      [s.id]: {
        ...r[s.id],
        userDisliked: true,
        userLiked: false,
        dislikes: (r[s.id]?.dislikes ?? s.dislikes ?? 0) + 1,
        likes: r[s.id]?.userLiked
          ? Math.max(0, (r[s.id]?.likes ?? s.likes ?? 0) - 1)
          : (r[s.id]?.likes ?? s.likes ?? 0),
      },
    }));

    if (s.kind !== "synth") {
      const res = await fetch(`/api/sounds/${s.id}/dislike`, { method: "POST" }).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setReactions((r) => ({ ...r, [s.id]: { ...r[s.id], likes: data.likes, dislikes: data.dislikes } }));
      }
    }
  }, [reactions]);

  // ── Download file ──────────────────────────────────────────────────────
  // Proxy through /api/sounds/[id]/file (same-origin) so the browser's
  // `download` attribute works and no CORS error occurs.
  // The API route fetches from Firebase server-side and streams back with
  // Content-Disposition: attachment, triggering an automatic save dialog.
  const downloadFile = useCallback((s, e) => {
    e.stopPropagation();
    if (s.kind !== "file" || !s.id) return;

    const a = document.createElement("a");
    a.href     = `/api/sounds/${s.id}/file`;
    a.download = s.filename || `${s.name.replace(/[^a-z0-9]/gi, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Optimistic counter update (API route also increments server-side)
    setReactions((r) => ({
      ...r,
      [s.id]: { ...r[s.id], downloads: (r[s.id]?.downloads ?? s.downloads ?? 0) + 1 },
    }));
  }, []);

  // ── Share ──────────────────────────────────────────────────────────────
  const share = useCallback((s, e) => {
    e.stopPropagation();
    const text = `"${s.name}" — MemeVault`;
    if (navigator.share) {
      navigator.share({ title: s.name, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${window.location.origin}?q=${encodeURIComponent(s.name)}`).catch(() => {});
    }
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
      if (e.key === "Escape") stopAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopAll]);

  // ── Canvas waveform ────────────────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
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
          x === 0 ? ctx.moveTo(x, h/2 + v*(h/2)*0.85) : ctx.lineTo(x, h/2 + v*(h/2)*0.85);
        }
        ctx.globalAlpha = 1;
      } else {
        const tt = performance.now() / 900;
        for (let x = 0; x < w; x++) {
          const y = h/2 + Math.sin(x/32 + tt)*3.5*Math.sin(tt*0.6);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.3;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
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
      return [...arr].sort((a, b) => ((reactions[b.id]?.downloads ?? b.downloads ?? b.plays ?? 0)) - ((reactions[a.id]?.downloads ?? a.downloads ?? a.plays ?? 0)));
    return arr.filter((s) => s.category === cat);
  }, [sounds, query, cat, reactions]);

  const playingSound  = sounds.find((s) => s.id === playingId);
  const playCatMeta   = playingSound ? getCat(playingSound.category) : null;

  // Per-sound reactive getters
  const getLikes     = (s) => reactions[s.id]?.likes     ?? s.likes     ?? 0;
  const getDislikes  = (s) => reactions[s.id]?.dislikes  ?? s.dislikes  ?? 0;
  const getDownloads = (s) => reactions[s.id]?.downloads ?? s.downloads ?? s.plays ?? 0;
  const hasLiked     = (id) => !!reactions[id]?.userLiked;
  const hasDisliked  = (id) => !!reactions[id]?.userDisliked;

  return (
    <div style={S.root}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.topRow}>
          <div style={S.brand}>
            <span style={S.wordmark}>Meme<span style={{ color: "var(--accent)" }}>Vault</span></span>
          </div>

          <div style={S.searchWrap}>
            <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search meme sounds…" style={S.searchInput} />
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
            <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              style={S.volSlider} aria-label="Volume" />
            <Link href="/upload" style={S.uploadBtn}><Upload size={13} /> Upload</Link>
          </div>
        </div>

        {/* Canvas waveform */}
        <div style={S.canvasWrap}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

        {/* Now playing bar */}
        {playingSound && (
          <div style={{ ...S.nowPlaying, borderColor: `${playCatMeta.color}40`, background: `${playCatMeta.color}10` }}>
            <WaveBars color={playCatMeta.color} height={16} gap={2} barW={2} />
            <span style={S.nowText}>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>Playing · </span>
              {playingSound.name}
              <span style={{ ...S.miniPill, background: `${playCatMeta.color}20`, color: playCatMeta.color }}>
                {playCatMeta.emoji} {playingSound.category}
              </span>
            </span>
            <button onClick={stopAll} style={{ ...S.stopNowBtn, color: playCatMeta.color, borderColor: `${playCatMeta.color}40` }}>
              <Square size={10} fill="currentColor" /> Stop
            </button>
          </div>
        )}

        {/* Category chips */}
        <div style={S.chips}>
          {cats.map((c) => {
            const m = getCat(c);
            const active = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)}
                style={{ ...S.chip, ...(active ? { color: m.color, borderColor: m.color, background: `${m.color}15` } : {}) }}>
                {c !== "All" && <span style={{ marginRight: 4 }}>{m.emoji}</span>}{c}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Grid ── */}
      <main style={S.grid}>
        {source === "loading" && (
          <div style={S.loadState}><WaveBars color="var(--muted)" height={22} /> Loading vault…</div>
        )}

        {list.map((s) => {
          const meta      = getCat(s.category);
          const isPlaying = playingId === s.id;
          const liked     = hasLiked(s.id);
          const disliked  = hasDisliked(s.id);

          return (
            <div key={s.id} className="soundCard" style={{
              ...S.card,
              borderColor:  isPlaying ? meta.color : "var(--border)",
              boxShadow:    isPlaying ? `0 0 28px ${meta.color}28, 0 4px 24px rgba(0,0,0,0.5)` : "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              {/* Row 1: category + like/dislike + share */}
              <div style={S.cardTop}>
                <span style={{ ...S.catBadge, background: `${meta.color}18`, color: meta.color }}>
                  {meta.emoji} {s.category}
                </span>
                <div style={S.cardActions}>
                  <button onClick={(e) => like(s, e)} style={S.actionBtn} title="Like">
                    <ThumbsUp size={13} fill={liked ? "currentColor" : "none"}
                      style={{ color: liked ? "#22c55e" : "var(--muted)", transition: "color .15s" }} />
                    {getLikes(s) > 0 && (
                      <span style={{ ...S.reactionCount, color: liked ? "#22c55e" : "var(--muted)" }}>
                        {fmt(getLikes(s))}
                      </span>
                    )}
                  </button>
                  <button onClick={(e) => dislike(s, e)} style={S.actionBtn} title="Dislike">
                    <ThumbsDown size={13} fill={disliked ? "currentColor" : "none"}
                      style={{ color: disliked ? "#ef4444" : "var(--muted)", transition: "color .15s" }} />
                    {getDislikes(s) > 0 && (
                      <span style={{ ...S.reactionCount, color: disliked ? "#ef4444" : "var(--muted)" }}>
                        {fmt(getDislikes(s))}
                      </span>
                    )}
                  </button>
                  <button onClick={(e) => share(s, e)} style={S.actionBtn} title="Share">
                    <Share2 size={13} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              </div>

              {/* Row 2: sound name */}
              <div style={S.cardName}>{s.name}</div>

              {/* Row 3: waveform + play + download + stats */}
              <div style={S.cardBottom}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {isPlaying ? <WaveBars color={meta.color} height={14} gap={2} barW={2} /> : <WaveFlat color="var(--muted)" height={14} />}
                </div>

                {/* Play / Stop */}
                <button onClick={() => play(s)} style={{
                  ...S.playBtn,
                  background: isPlaying ? meta.color : "var(--surface)",
                  border: `2px solid ${isPlaying ? meta.color : "var(--border-hover)"}`,
                  color: isPlaying ? "#fff" : "var(--text2)",
                  boxShadow: isPlaying ? `0 0 16px ${meta.color}50` : "none",
                }} aria-label={isPlaying ? "Stop" : "Play"}>
                  {isPlaying
                    ? <Square size={12} fill="currentColor" />
                    : <Play size={12} fill="currentColor" style={{ marginLeft: 1 }} />
                  }
                </button>

                {/* Download button */}
                {s.kind === "file" && (
                  <button
                    onClick={(e) => downloadFile(s, e)}
                    style={S.dlBtn}
                    title="Download MP3"
                  >
                    <Download size={13} style={{ color: "var(--muted)" }} />
                  </button>
                )}

                {/* Stats */}
                <div style={S.stats}>
                  <span style={S.statLine}>⬇️ {fmt(getDownloads(s))}</span>
                  {s.dur && <span style={S.statLine}>⏱ {s.dur}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {list.length === 0 && source !== "loading" && (
          <div style={S.emptyState}>
            {query
              ? <>Nothing matches <b>"{query}"</b></>
              : <>No sounds here yet. <Link href="/upload" style={{ color: "var(--accent)", fontWeight: 700 }}>Upload one →</Link></>
            }
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <span style={{ fontWeight: 700 }}>Meme<span style={{ color: "var(--accent)" }}>Vault</span></span>
        <span style={{ color: "var(--muted)" }}>Click to play · Esc stops all · ⬇ to download</span>
      </footer>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  root: { minHeight: "100vh", display: "flex", flexDirection: "column" },

  header: {
    position: "sticky", top: 0, zIndex: 10,
    background: "rgba(8,8,15,0.96)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border)",
    padding: "16px clamp(16px,4vw,52px) 12px",
  },
  topRow: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 },
  brand: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  logoEmoji: { fontSize: 26, lineHeight: 1 },
  wordmark: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "var(--text)" },

  searchWrap: {
    flex: 1, minWidth: 160, maxWidth: 460,
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px",
  },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 14.5, fontFamily: "inherit" },

  controls: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  ctrlBtn: {
    width: 36, height: 36, display: "grid", placeItems: "center",
    background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 10, cursor: "pointer",
  },
  iconBtn: { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "grid", placeItems: "center" },
  volSlider: { width: 76, cursor: "pointer" },
  uploadBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "var(--accent)", color: "#fff", borderRadius: 10,
    padding: "8px 14px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap",
  },

  canvasWrap: {
    height: 48, borderRadius: 10,
    background: "rgba(0,0,0,0.45)", border: "1px solid var(--border)",
    overflow: "hidden", padding: "0 8px", marginBottom: 12,
  },

  nowPlaying: { display: "flex", alignItems: "center", gap: 10, border: "1px solid", borderRadius: 12, padding: "9px 14px", marginBottom: 12 },
  nowText: { flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  miniPill: { display: "inline-flex", alignItems: "center", gap: 3, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  stopNowBtn: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  chips: { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" },
  chip: { display: "flex", alignItems: "center", cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", transition: "all .15s" },
  demoNote: { fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-data)", marginLeft: 4 },
  localNote: { fontSize: 11.5, color: "#06b6d4", fontFamily: "var(--font-data)", marginLeft: 4 },
  mongoNote: { fontSize: 11.5, color: "#10b981", fontFamily: "var(--font-data)", marginLeft: 4 },
  code: { background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, fontSize: 11 },

  grid: { flex: 1, padding: "20px clamp(16px,4vw,52px) 48px", display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", alignContent: "start" },
  loadState: { gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--muted)", fontSize: 15, padding: "80px 20px" },
  emptyState: { gridColumn: "1/-1", textAlign: "center", color: "var(--muted)", padding: "60px 20px", fontSize: 15, lineHeight: 1.7 },

  card: { background: "var(--card)", border: "1px solid", borderRadius: 18, padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 },

  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 },
  catBadge: { display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "3px 10px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" },
  cardActions: { display: "flex", gap: 2, flexShrink: 0 },
  actionBtn: { display: "flex", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", borderRadius: 7, padding: "3px 5px" },
  reactionCount: { fontSize: 11, fontFamily: "var(--font-data)", fontWeight: 700 },

  cardName: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17.5, letterSpacing: "-0.01em", lineHeight: 1.2, color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  cardBottom: { display: "flex", alignItems: "center", gap: 7 },
  playBtn: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "50%", cursor: "pointer", flexShrink: 0, transition: "background .15s, border-color .15s, box-shadow .15s" },
  dlBtn: { width: 30, height: 30, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", flexShrink: 0 },
  stats: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  statLine: { fontSize: 10.5, fontFamily: "var(--font-data)", color: "var(--muted)" },

  footer: { borderTop: "1px solid var(--border)", padding: "14px clamp(16px,4vw,52px)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: "var(--text2)", fontFamily: "var(--font-data)" },
};
