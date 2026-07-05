"use client";

import React, {
  useState, useRef, useEffect, useCallback, useMemo, CSSProperties,
} from "react";
import Link from "next/link";
import { Search, Volume2, VolumeX, Square, Upload, X } from "lucide-react";
import { SYNTHS, getSynth } from "@/lib/synths";
import { getEngine } from "@/lib/audio";
import { getCat, CATEGORIES, parseDurMs, type Sound } from "@/lib/soundMeta";
import { WaveBars } from "@/components/WaveBars";
import { SoundCard } from "@/components/SoundCard";

const PAGE_SIZE = 60;

export default function MemeVault() {
  const [sounds, setSounds]       = useState<Sound[]>([]);
  const [source, setSource]       = useState("loading");
  const [query, setQuery]         = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cat, setCat]             = useState("All");
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(0.8);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Pagination / infinite scroll
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal]           = useState(0);

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const liveRef     = useRef(0);
  const rafRef      = useRef<number>(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapSound = (s: Sound): Sound => ({ ...s, kind: "file" as const, url: s.firebaseUrl || s.url });

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (cat && cat !== "All") params.set("cat", cat);
    return `/api/sounds?${params.toString()}`;
  }, [debouncedQuery, cat]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load page 1 whenever the search term or category changes
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
      setHasMore(false);
    };

    setSource("loading");
    fetch(buildUrl(1))
      .then((r) => r.json().then((d) => ({ d, src: r.headers.get("X-Sound-Source") || "local" })))
      .then(({ d, src }: { d: { sounds: Sound[]; total: number; hasMore: boolean }; src: string }) => {
        if (cancelled) return;
        const arr = (d.sounds || []).map(mapSound);
        // Only fall back to demo synths when the DB is genuinely empty
        if (arr.length === 0 && !debouncedQuery && cat === "All") { useSynths(); return; }
        setSounds(arr);
        setPage(1);
        setHasMore(!!d.hasMore);
        setTotal(d.total ?? arr.length);
        setSource(src);
      })
      .catch(() => {
        if (cancelled) return;
        if (!debouncedQuery && cat === "All") useSynths();
        else { setSounds([]); setHasMore(false); setSource("none"); }
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, cat, buildUrl]);

  // Append the next page (infinite scroll)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || source === "demo" || source === "loading") return;
    const next = page + 1;
    setLoadingMore(true);
    fetch(buildUrl(next))
      .then((r) => r.json())
      .then((d: { sounds: Sound[]; hasMore: boolean }) => {
        const arr = (d.sounds || []).map(mapSound);
        setSounds((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          return [...prev, ...arr.filter((s) => !seen.has(s.id))];
        });
        setPage(next);
        setHasMore(!!d.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, source, page, buildUrl]);

  // Observe the sentinel at the bottom of the list
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "800px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

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
    setPlayingId(s.id);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Set optimistic liveRef immediately so canvas animates while loading
    liveRef.current = performance.now() + parseDurMs(s.dur);

    if (s.kind === "file" && s.id) {
      const streamUrl = `/api/sounds/${s.id}/stream`;
      const directUrl = s.url;
      eng.playUrl(directUrl ?? streamUrl, directUrl ? streamUrl : undefined)
        .then((actualDurMs) => {
          // Correct with real duration once audio actually starts
          liveRef.current = performance.now() + actualDurMs;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(
            () => setPlayingId((id) => (id === s.id ? null : id)),
            actualDurMs,
          );
        })
        .catch(console.error);
      fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
    } else if (s.kind === "synth" && s.synthId) {
      const def = getSynth(s.synthId);
      if (def) eng.playSynth(def.make);
      const durMs = parseDurMs(s.dur);
      liveRef.current = performance.now() + durMs;
      timerRef.current = setTimeout(
        () => setPlayingId((id) => (id === s.id ? null : id)),
        durMs,
      );
    }
  }, [playingId]);

  const stopAll = useCallback(() => {
    getEngine().stopAll();
    setPlayingId(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const changeCategory = useCallback((c: string) => {
    stopAll();
    setCat(c);
  }, [stopAll]);

  const downloadFile = useCallback((s: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.kind !== "file" || !s.id) return;
    const a = document.createElement("a");
    a.href = `/api/sounds/${s.id}/file`;
    a.download = s.filename || `${s.name.replace(/[^a-z0-9]/gi, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
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

  const cats = CATEGORIES;

  // Server already filters/paginates real data. Only the demo (synth) fallback
  // needs client-side filtering so the chips still work with no DB.
  const list = useMemo(() => {
    if (source !== "demo") return sounds;
    const q = debouncedQuery.toLowerCase();
    return sounds.filter((s) => {
      if (cat !== "All" && s.category !== cat) return false;
      if (q && !(s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sounds, source, debouncedQuery, cat]);

  const playingSound = sounds.find((s) => s.id === playingId);
  const playCatMeta  = playingSound ? getCat(playingSound.category) : null;

  const onHoverEnter = useCallback((s: Sound) => {
    if (s.kind !== "file") return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const streamUrl = `/api/sounds/${s.id}/stream`;
      getEngine().preload(s.url ?? streamUrl, s.url ? streamUrl : undefined);
    }, 200);
  }, []);

  const onHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

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
                onClick={() => changeCategory(c)}
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
          <Link href="/gifs" style={S.blogLink}>
            🎞️ Meme GIFs
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
            <span style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <span style={{ color: "#ff2d87" }}>meme</span>
              <span>music</span>
              <span style={{ color: "#ff2d87", fontSize: 12, opacity: 0.6, marginLeft: 2 }}>.fun</span>
            </span>
            <Link href="/gifs" className="mobileSwitchBtn">
              🎞️ GIFs
            </Link>
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
                  onClick={() => changeCategory(c)}
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
            {list.map((s) => (
              <SoundCard
                key={s.id}
                sound={s}
                isPlaying={playingId === s.id}
                onPlay={play}
                onHoverEnter={onHoverEnter}
                onHoverLeave={onHoverLeave}
                onDownload={downloadFile}
              />
            ))}

            {list.length === 0 && source !== "loading" && (
              <div style={S.emptyState}>
                {query
                  ? <><b>&ldquo;{query}&rdquo;</b> — no results</>
                  : <>No sounds yet. <Link href="/upload" style={{ color: "var(--accent)", fontWeight: 700 }}>Upload one →</Link></>}
              </div>
            )}

            {/* Infinite-scroll sentinel + status (real data only) */}
            {source !== "demo" && source !== "loading" && (
              <div ref={sentinelRef} style={S.listFooter}>
                {loadingMore ? (
                  <><WaveBars color="var(--muted)" height={16} count={5} /> Loading more…</>
                ) : hasMore ? (
                  <button onClick={loadMore} style={S.loadMoreBtn}>Load more</button>
                ) : total > 0 ? (
                  <span>{total} sound{total === 1 ? "" : "s"} · you&rsquo;ve reached the end</span>
                ) : null}
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
  listFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "var(--muted)",
    fontSize: 13,
    padding: "24px 20px 40px",
    minHeight: 40,
  },
  loadMoreBtn: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 10,
    padding: "9px 20px",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
  },
};
