"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Volume2, VolumeX, Square, Zap, Plus } from "lucide-react";
import { SYNTHS, getSynth } from "@/lib/synths";
import { getEngine } from "@/lib/audio";
import { isFirebaseConfigured, db } from "@/lib/firebase";

const PALETTE = [
  "#FF6B5E", "#FF9F45", "#FFCA3A", "#B5E84C", "#54E39B",
  "#2DD4BF", "#4CC2FF", "#7C8BFF", "#B07CFF", "#FF6FD8", "#FF5C8A",
];
const colorFor = (i) => PALETTE[i % PALETTE.length];

export default function Soundboard() {
  const [sounds, setSounds] = useState([]);
  const [source, setSource] = useState("loading"); // loading | demo | firebase
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [activeId, setActiveId] = useState(null);
  const [pressedId, setPressedId] = useState(null);
  const [ripple, setRipple] = useState({});
  const [counts, setCounts] = useState({});

  const canvasRef = useRef(null);
  const liveRef = useRef(0);
  const flashTimer = useRef(null);
  const cleanupRef = useRef(null);

  // ---- load sounds: Firestore if configured, else the synth demo ----
  useEffect(() => {
    let cancelled = false;
    const loadDemo = () => {
      const mapped = SYNTHS.map((s) => ({
        id: s.id, name: s.name, category: s.category,
        hotkey: s.hotkey, dur: s.dur, kind: "synth", synthId: s.id,
      }));
      setSounds(mapped);
      setSource("demo");
      setCounts(
        SYNTHS.reduce((a, s, i) => ((a[s.id] = ((i * 37) % 19) * 6 + 4), a), {})
      );
    };

    if (isFirebaseConfigured && db) {
      import("firebase/firestore").then(({ collection, onSnapshot, query: fsQuery, orderBy }) => {
        if (cancelled) return;
        const q = fsQuery(collection(db, "sounds"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const docs = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id, name: data.name, category: data.category || "Sounds",
                hotkey: (data.hotkey || "").toUpperCase(), dur: data.dur || "",
                kind: "file", url: data.url,
              };
            });
            setSounds(docs);
            setSource("firebase");
            setCounts((prev) => {
              const next = { ...prev };
              snap.docs.forEach((d) => { next[d.id] = d.data().plays || 0; });
              return next;
            });
          },
          (err) => { console.error("Firestore read failed:", err); loadDemo(); }
        );
        cleanupRef.current = unsub;
      });
    } else {
      loadDemo();
    }
    return () => { cancelled = true; if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  // ---- volume / mute -> engine ----
  useEffect(() => {
    getEngine().setVolume(volume, muted);
  }, [volume, muted]);

  // ---- play ----
  const play = useCallback((s) => {
    const eng = getEngine();
    eng.ensure();
    if (s.kind === "file" && s.url) {
      eng.playUrl(s.url).catch((e) => console.error("playback failed:", e));
    } else if (s.kind === "synth") {
      const def = getSynth(s.synthId);
      if (def) eng.playSynth(def.make);
    }
    liveRef.current = performance.now() + 1400;

    setActiveId(s.id);
    setRipple((r) => ({ ...r, [s.id]: (r[s.id] || 0) + 1 }));
    setCounts((c) => ({ ...c, [s.id]: (c[s.id] || 0) + 1 }));
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setActiveId(null), 320);

    // persist play count when backed by Firestore
    if (source === "firebase" && db) {
      import("firebase/firestore").then(({ doc, updateDoc, increment }) => {
        updateDoc(doc(db, "sounds", s.id), { plays: increment(1) }).catch(() => {});
      });
    }
  }, [source]);

  const stopAll = useCallback(() => getEngine().stopAll(), []);

  // ---- keyboard hotkeys ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === "Escape") { stopAll(); return; }
      const k = e.key.toUpperCase();
      const s = sounds.find((x) => x.hotkey === k);
      if (s) {
        e.preventDefault();
        setPressedId(s.id);
        play(s);
        setTimeout(() => setPressedId(null), 110);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sounds, play, stopAll]);

  // ---- visualizer ----
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx2 = cv.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx2.clearRect(0, 0, w, h);
      const grad = ctx2.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#FF9F45"); grad.addColorStop(0.5, "#FF6FD8"); grad.addColorStop(1, "#7C8BFF");
      ctx2.strokeStyle = grad; ctx2.lineWidth = 2.5; ctx2.lineJoin = "round"; ctx2.lineCap = "round";

      const analyser = getEngine().analyser;
      const live = performance.now() < liveRef.current;
      ctx2.beginPath();
      if (analyser && live) {
        const buf = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(buf);
        const step = buf.length / w;
        for (let x = 0; x < w; x++) {
          const v = (buf[Math.floor(x * step)] - 128) / 128;
          const y = h / 2 + v * (h / 2) * 0.9;
          x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
        }
        ctx2.globalAlpha = 1;
      } else {
        const tt = performance.now() / 600;
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x / 26 + tt) * 4 * Math.sin(tt * 0.7);
          x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
        }
        ctx2.globalAlpha = 0.5;
      }
      ctx2.stroke();
      ctx2.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- derived: categories + filtered list ----
  const cats = useMemo(() => {
    const set = new Set(sounds.map((s) => s.category).filter(Boolean));
    return ["All", "Trending", ...Array.from(set)];
  }, [sounds]);

  const list = useMemo(() => {
    let arr = sounds.map((s, i) => ({ ...s, color: colorFor(i) }));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)
      );
    }
    if (cat === "Trending") arr = [...arr].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    else if (cat !== "All") arr = arr.filter((s) => s.category === cat);
    return arr;
  }, [sounds, query, cat, counts]);

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.brandRow}>
          <div style={S.brand}>
            <span style={S.logoMark}><Zap size={18} strokeWidth={2.6} /></span>
            <span style={S.wordmark}>BLIP<span style={{ color: "var(--accent)" }}>board</span></span>
          </div>

          <div style={S.controls}>
            <Link href="/upload" style={S.addBtn}>
              <Plus size={15} strokeWidth={3} /> Add sound
            </Link>
            <button onClick={stopAll} style={S.stopBtn} aria-label="Stop all sounds">
              <Square size={13} strokeWidth={3} fill="currentColor" /> Stop
            </button>
            <button onClick={() => setMuted((m) => !m)} style={S.iconBtn}
              aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              style={S.slider} aria-label="Volume" />
          </div>
        </div>

        <div style={S.viz}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

        <div style={S.searchWrap}>
          <Search size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the board…" style={S.search} />
          {query && (
            <button onClick={() => setQuery("")} style={S.clearBtn} aria-label="Clear search">✕</button>
          )}
        </div>

        <div style={S.chips}>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              style={{ ...S.chip, ...(cat === c ? S.chipActive : {}) }}>
              {c}
            </button>
          ))}
          {source === "demo" && (
            <span style={S.demoTag}>demo sounds · add Firebase keys to load your own</span>
          )}
        </div>
      </header>

      <main style={S.grid}>
        {list.map((s) => {
          const isActive = activeId === s.id;
          const isPressed = pressedId === s.id;
          return (
            <button key={s.id} className="pad"
              onPointerDown={() => { setPressedId(s.id); play(s); }}
              onPointerUp={() => setPressedId(null)}
              onPointerLeave={() => setPressedId(null)}
              style={{
                ...S.pad,
                background: `linear-gradient(160deg, ${s.color}, ${shade(s.color, -36)})`,
                transform: isPressed ? "translateY(4px)" : "translateY(0)",
                boxShadow: isPressed
                  ? `0 2px 0 ${shade(s.color, -38)}, 0 4px 10px rgba(0,0,0,.4)`
                  : `0 6px 0 ${shade(s.color, -38)}, 0 12px 22px rgba(0,0,0,.45)`,
                outline: isActive ? `2px solid ${s.color}` : "none",
                outlineOffset: 3,
              }}>
              <span style={{ ...S.glow, opacity: isActive ? 0.9 : 0 }} />
              <span key={ripple[s.id] || 0} className="ripple" style={{ background: s.color }} />
              {s.hotkey && <span style={S.padKey}>{s.hotkey}</span>}
              <span style={S.padName}>{s.name}</span>
              <span style={S.padMeta}>
                <span style={S.padCat}>{s.category}</span>
                <span style={S.padNums}>{fmt(counts[s.id] || 0)}{s.dur ? ` · ${s.dur}` : ""}</span>
              </span>
            </button>
          );
        })}

        {source === "firebase" && list.length === 0 && !query && (
          <div style={S.empty}>
            Your board is empty. <Link href="/upload" style={{ color: "var(--accent)", fontWeight: 700 }}>Add your first sound →</Link>
          </div>
        )}
        {query && list.length === 0 && (
          <div style={S.empty}>Nothing matches “{query}”. Try another word, or clear the search.</div>
        )}
      </main>

      <footer style={S.footer}>
        <span>Tap a pad or press its key · <b style={{ color: "var(--text)" }}>Esc</b> stops everything</span>
        <span style={{ color: "var(--muted)" }}>
          {source === "firebase" ? "Live from your Firebase library." : "Demo board — sounds synthesized in your browser."}
        </span>
      </footer>
    </div>
  );
}

/* ---------- helpers ---------- */
function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

/* ---------- styles ---------- */
const S = {
  root: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: {
    position: "sticky", top: 0, zIndex: 10,
    background: "linear-gradient(180deg, var(--panel) 0%, rgba(22,19,31,.96) 100%)",
    backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)",
    padding: "16px clamp(14px,4vw,40px) 14px",
  },
  brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center",
    background: "var(--accent)", color: "#1b0f0a",
    boxShadow: "0 4px 0 #c2462b, 0 8px 16px rgba(255,107,74,.4)",
  },
  wordmark: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" },
  controls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  addBtn: {
    display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
    background: "var(--accent)", color: "#1b0f0a", border: "none",
    borderRadius: 9, padding: "8px 13px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  },
  stopBtn: {
    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    background: "transparent", color: "var(--text)", border: "1px solid var(--line)",
    borderRadius: 9, padding: "7px 12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  },
  iconBtn: {
    width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer",
    background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 9,
  },
  slider: { width: 84, accentColor: "var(--accent)", cursor: "pointer" },
  viz: {
    height: 56, margin: "14px 0", borderRadius: 12,
    background: "rgba(0,0,0,.28)", border: "1px solid var(--line)", overflow: "hidden", padding: "0 8px",
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px",
  },
  search: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "var(--text)", fontSize: 15, fontFamily: "inherit",
  },
  clearBtn: { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 4 },
  chips: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" },
  chip: {
    cursor: "pointer", border: "1px solid var(--line)", background: "transparent",
    color: "var(--muted)", borderRadius: 999, padding: "6px 14px",
    fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  },
  chipActive: { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" },
  demoTag: { fontFamily: "var(--font-data)", fontSize: 11, color: "var(--muted)", marginLeft: 4 },
  grid: {
    flex: 1, padding: "20px clamp(14px,4vw,40px) 40px", display: "grid", gap: 16,
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", alignContent: "start",
  },
  pad: {
    position: "relative", overflow: "hidden", cursor: "pointer", border: "none",
    borderRadius: 16, padding: "16px 14px", minHeight: 128, textAlign: "left",
    fontFamily: "inherit", color: "#171019", display: "flex", flexDirection: "column",
    justifyContent: "space-between", transition: "transform .06s ease, box-shadow .06s ease",
    WebkitTapHighlightColor: "transparent",
  },
  glow: {
    position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none",
    background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,.55), transparent 65%)",
    transition: "opacity .25s ease",
  },
  padKey: {
    position: "absolute", top: 10, right: 12, fontFamily: "var(--font-data)",
    fontSize: 12, fontWeight: 700, background: "rgba(0,0,0,.22)", color: "rgba(0,0,0,.7)",
    borderRadius: 6, padding: "2px 7px", lineHeight: 1.4,
  },
  padName: {
    fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.01em",
    lineHeight: 1.1, marginTop: 22, position: "relative", zIndex: 2,
  },
  padMeta: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 4 },
  padCat: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.62 },
  padNums: { fontFamily: "var(--font-data)", fontSize: 11.5, opacity: 0.72 },
  empty: { gridColumn: "1 / -1", textAlign: "center", color: "var(--muted)", padding: "60px 20px", fontSize: 15, lineHeight: 1.6 },
  footer: {
    borderTop: "1px solid var(--line)", padding: "14px clamp(14px,4vw,40px)",
    display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-data)",
  },
};
