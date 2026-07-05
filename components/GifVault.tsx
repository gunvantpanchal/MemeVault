"use client";

import React, {
  useState, useRef, useEffect, useCallback, CSSProperties,
} from "react";
import Link from "next/link";
import { Search, Upload, X, Download, Share2, Link2, Check } from "lucide-react";
import { getCat, CATEGORIES, type Gif } from "@/lib/gifMeta";
import { GifCard } from "@/components/GifCard";
import { GifMedia } from "@/components/GifMedia";

const PAGE_SIZE = 60;

export default function GifVault() {
  const [gifs, setGifs]           = useState<Gif[]>([]);
  const [source, setSource]       = useState("loading");
  const [query, setQuery]         = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cat, setCat]             = useState("All");
  const [active, setActive]       = useState<Gif | null>(null);
  const [copied, setCopied]       = useState(false);

  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal]           = useState(0);
  const [catCounts, setCatCounts]   = useState<Record<string, number> | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/gifs/categories")
      .then((r) => r.json())
      .then((d: { counts: Record<string, number> }) => setCatCounts(d.counts || {}))
      .catch(() => setCatCounts({}));
  }, []);

  const mapGif = (g: Gif): Gif => ({ ...g, kind: "file" as const, url: g.firebaseUrl || g.url });

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (cat && cat !== "All") params.set("cat", cat);
    return `/api/gifs?${params.toString()}`;
  }, [debouncedQuery, cat]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setSource("loading");
    fetch(buildUrl(1))
      .then((r) => r.json().then((d) => ({ d, src: r.headers.get("X-Gif-Source") || "local" })))
      .then(({ d, src }: { d: { gifs: Gif[]; total: number; hasMore: boolean }; src: string }) => {
        if (cancelled) return;
        const arr = (d.gifs || []).map(mapGif);
        setGifs(arr);
        setPage(1);
        setHasMore(!!d.hasMore);
        setTotal(d.total ?? arr.length);
        setSource(src);
      })
      .catch(() => {
        if (cancelled) return;
        setGifs([]); setHasMore(false); setSource("none");
      });
    return () => { cancelled = true; };
  }, [debouncedQuery, cat, buildUrl]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || source === "loading") return;
    const next = page + 1;
    setLoadingMore(true);
    fetch(buildUrl(next))
      .then((r) => r.json())
      .then((d: { gifs: Gif[]; hasMore: boolean }) => {
        const arr = (d.gifs || []).map(mapGif);
        setGifs((prev) => {
          const seen = new Set(prev.map((g) => g.id));
          return [...prev, ...arr.filter((g) => !seen.has(g.id))];
        });
        setPage(next);
        setHasMore(!!d.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, source, page, buildUrl]);

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

  const changeCategory = useCallback((c: string) => setCat(c), []);

  const downloadFile = useCallback((g: Gif, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = document.createElement("a");
    a.href = `/api/gifs/${g.id}/file`;
    a.download = g.filename || `${g.name.replace(/[^a-z0-9]/gi, "_")}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    fetch(`/api/gifs/${g.id}/download`, { method: "POST" }).catch(() => {});
  }, []);

  const share = useCallback((g: Gif) => {
    const url = `${window.location.origin}/gifs/${g.id}`;
    if (navigator.share) {
      navigator.share({ title: g.name, text: `"${g.name}" — Blipboard GIFs`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Only show categories that actually have GIFs (plus "All" and whichever
  // category is currently selected, so the active chip never disappears).
  const cats = catCounts === null
    ? ["All"]
    : CATEGORIES.filter((c) => c === "All" || c === cat || (catCounts[c] ?? 0) > 0);
  const activeMeta = active ? getCat(active.category) : null;

  return (
    <div className="appRoot">

      {/* ── Sidebar ── */}
      <aside className="appSidebar">
        <div style={S.logo}>
          <span style={{ color: "#ff2d87" }}>meme</span>
          <span style={{ color: "#fff" }}>Gif</span>
        </div>
        <div style={S.domainSub}>mememusic.fun</div>

        <div style={S.divider} />

        <nav style={S.sidebarNav}>
          {cats.map((c) => {
            const m = getCat(c);
            const isActive = cat === c;
            return (
              <button
                key={c}
                onClick={() => changeCategory(c)}
                className={`sidebarItem${isActive ? " sidebarItemActive" : ""}`}
                style={isActive ? { color: m.color } : undefined}
              >
                <span className="sidebarEmoji">{c === "All" ? "🎞️" : m.emoji}</span>
                <span>{c === "All" ? "All GIFs" : c}</span>
                {isActive && <span className="sidebarDot" style={{ background: m.color }} />}
              </button>
            );
          })}
        </nav>

        <div style={S.sidebarFooter}>
          <Link href="/gifs/upload" className="sidebarUploadBtn">
            <Upload size={14} /> Upload GIF
          </Link>
          <Link href="/" style={S.soundLink}>
            🔊 Meme Sounds
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="appMain">
        <header className="appHeader">
          <div className="mobileLogo">
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
              <span>
                <span style={{ color: "#ff2d87" }}>meme</span>
                <span>Gif</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", letterSpacing: 0 }}>mememusic.fun</span>
            </span>
            <Link href="/" className="mobileSwitchBtn">
              🔊 Sounds
            </Link>
          </div>

          <div className="headerRow">
            <div className="searchWrap">
              <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meme GIFs…"
                style={S.searchInput}
              />
              {query && (
                <button onClick={() => setQuery("")} style={S.iconBtn}><X size={13} /></button>
              )}
            </div>

            <Link href="/gifs/upload" className="uploadBtn">
              <Upload size={13} /> Upload
            </Link>
          </div>

          <div className="mobileChips">
            {cats.map((c) => {
              const m = getCat(c);
              const isActive = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => changeCategory(c)}
                  className="chip"
                  style={isActive ? { color: m.color, borderColor: m.color, background: `${m.color}15` } : undefined}
                >
                  {c !== "All" && <span style={{ marginRight: 3 }}>{m.emoji}</span>}{c}
                </button>
              );
            })}
          </div>
        </header>

        <main>
          {source === "loading" && (
            <div style={S.loadState}>Loading GIFs…</div>
          )}

          <div className="gifGrid">
            {gifs.map((g) => (
              <GifCard key={g.id} gif={g} onOpen={setActive} onDownload={downloadFile} />
            ))}

            {gifs.length === 0 && source !== "loading" && (
              <div style={S.emptyState}>
                {query
                  ? <><b>&ldquo;{query}&rdquo;</b> — no results</>
                  : <>No GIFs yet. <Link href="/gifs/upload" style={{ color: "var(--accent)", fontWeight: 700 }}>Upload one →</Link></>}
              </div>
            )}
          </div>

          {source !== "loading" && gifs.length > 0 && (
            <div ref={sentinelRef} style={S.listFooter}>
              {loadingMore ? (
                <span>Loading more…</span>
              ) : hasMore ? (
                <button onClick={loadMore} style={S.loadMoreBtn}>Load more</button>
              ) : total > 0 ? (
                <span>{total} gif{total === 1 ? "" : "s"} · you&rsquo;ve reached the end</span>
              ) : null}
            </div>
          )}
        </main>
      </div>

      {/* ── Lightbox ── */}
      {active && activeMeta && (
        <div className="gifLightboxOverlay" onClick={() => setActive(null)}>
          <div className="gifLightbox" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <button className="gifLightboxClose" onClick={() => setActive(null)}><X size={16} /></button>
            <div className="gifLightboxMedia">
              <GifMedia url={active.firebaseUrl || active.url} name={active.name} />
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>{active.name}</div>
              <div style={{ color: activeMeta.color, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                {activeMeta.emoji} {active.category}
              </div>
            </div>
            <div className="detailActions" style={{ margin: "16px 0 0" }}>
              <Link href={`/gifs/${active.id}`} className="detailActionBtn">
                View page
              </Link>
              <button onClick={() => share(active)} className="detailActionBtn">
                {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? "Copied!" : "Share"}
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/gifs/${active.id}`;
                  navigator.clipboard?.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }).catch(() => {});
                }}
                className="detailActionBtn"
              >
                <Link2 size={16} /> Copy link
              </button>
              <button onClick={() => downloadFile(active)} className="detailActionBtn primary">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
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
    padding: "24px 20px 0",
    fontFamily: "var(--font-display)",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    flexShrink: 0,
  },
  domainSub: {
    padding: "2px 20px 16px",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--muted)",
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
  soundLink: {
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
  loadState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted)",
    fontSize: 15,
    padding: "80px 20px",
  },
  emptyState: {
    gridColumn: "1 / -1",
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
    padding: "0 20px 40px",
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
