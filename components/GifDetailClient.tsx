"use client";

import { useCallback, useState, CSSProperties } from "react";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, Share2, Link2, Download, Check,
} from "lucide-react";
import { getCat, fmt, type Gif } from "@/lib/gifMeta";
import { GifCard } from "@/components/GifCard";
import { GifMedia } from "@/components/GifMedia";

export default function GifDetailClient({ gif, similar }: { gif: Gif; similar: Gif[] }) {
  const [likes, setLikes]             = useState(gif.likes ?? 0);
  const [dislikes, setDislikes]       = useState(gif.dislikes ?? 0);
  const [userLiked, setUserLiked]     = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [copied, setCopied]           = useState(false);

  const meta = getCat(gif.category);

  const like = useCallback(async () => {
    if (userLiked) return;
    setUserLiked(true);
    setUserDisliked((wasDisliked) => {
      if (wasDisliked) setDislikes((n) => Math.max(0, n - 1));
      return false;
    });
    setLikes((n) => n + 1);
    const res = await fetch(`/api/gifs/${gif.id}/like`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { likes: number; dislikes: number };
      setLikes(data.likes);
      setDislikes(data.dislikes);
    }
  }, [gif.id, userLiked]);

  const dislike = useCallback(async () => {
    if (userDisliked) return;
    setUserDisliked(true);
    setUserLiked((wasLiked) => {
      if (wasLiked) setLikes((n) => Math.max(0, n - 1));
      return false;
    });
    setDislikes((n) => n + 1);
    const res = await fetch(`/api/gifs/${gif.id}/dislike`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { likes: number; dislikes: number };
      setLikes(data.likes);
      setDislikes(data.dislikes);
    }
  }, [gif.id, userDisliked]);

  const downloadGif = useCallback((g: Gif) => {
    const a = document.createElement("a");
    a.href = `/api/gifs/${g.id}/file`;
    a.download = g.filename || `${g.name.replace(/[^a-z0-9]/gi, "_")}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    fetch(`/api/gifs/${g.id}/download`, { method: "POST" }).catch(() => {});
  }, []);

  const share = useCallback(() => {
    const url = `${window.location.origin}/gifs/${gif.id}`;
    if (navigator.share) {
      navigator.share({ title: gif.name, text: `"${gif.name}" — GifVault`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }
  }, [gif.id, gif.name]);

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}/gifs/${gif.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [gif.id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <Link href="/gifs" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={S.logo}>
              <span style={{ color: "#ff2d87" }}>meme</span>
              <span>Gif</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>mememusic.fun</span>
          </Link>
          <Link href="/gifs" style={S.navBtn}>Open GifVault →</Link>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.breadcrumb}>
          <Link href="/gifs" style={{ color: "var(--muted)" }}>All GIFs</Link>
          <span style={{ color: "var(--muted)" }}> / </span>
          <span style={{ color: "var(--text2)" }}>{gif.category}</span>
        </div>

        <h1 style={S.title}>{gif.name}</h1>
        <div style={{ ...S.catLine, color: meta.color }}>
          <span>{meta.emoji}</span>
          <span>{gif.category}</span>
        </div>

        <div className="gifLightboxMedia" style={{ margin: "22px 0" }}>
          <GifMedia url={gif.firebaseUrl || gif.url} name={gif.name} />
        </div>

        <p style={S.favLine}>
          ❤️ <b>{fmt(likes)} users</b> liked this GIF
        </p>

        <div className="detailActions">
          <button
            onClick={like}
            className={`detailActionBtn${userLiked ? " active" : ""}`}
            style={userLiked ? { background: "#22c55e" } : undefined}
          >
            <ThumbsUp size={16} fill={userLiked ? "currentColor" : "none"} />
            Like{likes > 0 ? ` (${fmt(likes)})` : ""}
          </button>
          <button
            onClick={dislike}
            className={`detailActionBtn${userDisliked ? " active" : ""}`}
            style={userDisliked ? { background: "#ef4444" } : undefined}
          >
            <ThumbsDown size={16} fill={userDisliked ? "currentColor" : "none"} />
            Dislike{dislikes > 0 ? ` (${fmt(dislikes)})` : ""}
          </button>
          <button onClick={share} className="detailActionBtn">
            <Share2 size={16} /> Share
          </button>
          <button onClick={copyLink} className="detailActionBtn">
            {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Copied!" : "Copy link"}
          </button>
          <button onClick={() => downloadGif(gif)} className="detailActionBtn primary">
            <Download size={16} /> Download GIF
          </button>
        </div>

        {similar.length > 0 && (
          <section>
            <h2 style={S.h2}>Similar {gif.category} GIFs</h2>
            <div className="gifGrid" style={{ padding: 0 }}>
              {similar.map((g) => (
                <GifCard
                  key={g.id}
                  gif={g}
                  onOpen={(gd) => { window.location.href = `/gifs/${gd.id}`; }}
                  onDownload={(gd) => downloadGif(gd)}
                />
              ))}
            </div>
          </section>
        )}

        <div style={S.bottomCta}>
          <div style={S.ctaTitle}>Want more meme GIFs?</div>
          <p style={{ color: "var(--text2)", fontSize: 15, margin: "0 0 24px", lineHeight: 1.6 }}>
            Instant preview, free download, no sign-up.
          </p>
          <Link href="/gifs" style={S.ctaBtn}>Open GifVault →</Link>
        </div>
      </main>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: {
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(6,6,16,0.97)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    display: "flex",
    alignItems: "baseline",
    gap: 1,
  },
  navBtn: {
    fontSize: 13,
    fontWeight: 700,
    background: "linear-gradient(135deg, #ff2d87, #c4206d)",
    color: "#fff",
    borderRadius: 10,
    padding: "8px 16px",
    boxShadow: "0 4px 14px rgba(255,45,135,0.25)",
  },
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 20px 80px",
  },
  breadcrumb: {
    fontSize: 13,
    marginBottom: 28,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(24px, 4.5vw, 34px)",
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
    margin: "0 0 8px",
    wordBreak: "break-word",
  },
  catLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  favLine: {
    marginTop: 8,
    fontSize: 15,
    color: "var(--text2)",
  },
  h2: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(19px, 3vw, 24px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "16px 0 20px",
    color: "var(--text)",
  },
  bottomCta: {
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: 20,
    border: "1px solid rgba(255,45,135,0.2)",
    background: "rgba(255,45,135,0.04)",
    marginTop: 48,
  },
  ctaTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 10,
    letterSpacing: "-0.02em",
  },
  ctaBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, #ff2d87, #c4206d)",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 4px 16px rgba(255,45,135,0.3)",
  },
};
