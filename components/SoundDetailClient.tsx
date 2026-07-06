"use client";

import { useCallback, useEffect, useRef, useState, CSSProperties } from "react";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, Share2, Link2, Download, Square, Play, Check,
} from "lucide-react";
import { getEngine } from "@/lib/audio";
import { getCat, fmt, type Sound } from "@/lib/soundMeta";
import { WaveBars } from "@/components/WaveBars";
import { SoundCard } from "@/components/SoundCard";
import { SiteFooter } from "@/components/SiteFooter";

export default function SoundDetailClient({
  sound, similar, description, categoryHref,
}: {
  sound: Sound;
  similar: Sound[];
  description?: string;
  categoryHref?: string;
}) {
  const [playingId, setPlayingId]     = useState<string | null>(null);
  const [likes, setLikes]             = useState(sound.likes ?? 0);
  const [dislikes, setDislikes]       = useState(sound.dislikes ?? 0);
  const [userLiked, setUserLiked]     = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [copied, setCopied]           = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = getCat(sound.category);
  const isPlayingMain = playingId === sound.id;

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
    const streamUrl = `/api/sounds/${s.id}/stream`;
    const directUrl = s.url;
    eng.playUrl(directUrl ?? streamUrl, directUrl ? streamUrl : undefined)
      .then((actualDurMs) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(
          () => setPlayingId((id) => (id === s.id ? null : id)),
          actualDurMs,
        );
      })
      .catch(console.error);
    fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
  }, [playingId]);

  useEffect(() => () => {
    getEngine().stopAll();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const like = useCallback(async () => {
    if (userLiked) return;
    setUserLiked(true);
    setUserDisliked((wasDisliked) => {
      if (wasDisliked) setDislikes((n) => Math.max(0, n - 1));
      return false;
    });
    setLikes((n) => n + 1);
    const res = await fetch(`/api/sounds/${sound.id}/like`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { likes: number; dislikes: number };
      setLikes(data.likes);
      setDislikes(data.dislikes);
    }
  }, [sound.id, userLiked]);

  const dislike = useCallback(async () => {
    if (userDisliked) return;
    setUserDisliked(true);
    setUserLiked((wasLiked) => {
      if (wasLiked) setLikes((n) => Math.max(0, n - 1));
      return false;
    });
    setDislikes((n) => n + 1);
    const res = await fetch(`/api/sounds/${sound.id}/dislike`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { likes: number; dislikes: number };
      setLikes(data.likes);
      setDislikes(data.dislikes);
    }
  }, [sound.id, userDisliked]);

  const downloadSound = useCallback((s: Sound) => {
    const a = document.createElement("a");
    a.href = `/api/sounds/${s.id}/file`;
    a.download = s.filename || `${s.name.replace(/[^a-z0-9]/gi, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    fetch(`/api/sounds/${s.id}/download`, { method: "POST" }).catch(() => {});
  }, []);

  const share = useCallback(() => {
    const url = `${window.location.origin}/sound/${sound.slug ?? sound.id}`;
    if (navigator.share) {
      navigator.share({ title: sound.name, text: `"${sound.name}" — MemeMusic`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }
  }, [sound.id, sound.slug, sound.name]);

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}/sound/${sound.slug ?? sound.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [sound.id, sound.slug]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <Link href="/" style={S.logo}>
            <span style={{ color: "#ff2d87" }}>meme</span>
            <span>music</span>
            <span style={{ color: "#ff2d87", fontSize: 11, opacity: 0.6, marginLeft: 2 }}>.fun</span>
          </Link>
          <Link href="/" style={S.navBtn}>Open Soundboard →</Link>
        </div>
      </header>

      <main style={S.main}>
        {/* Breadcrumb */}
        <div style={S.breadcrumb}>
          <Link href="/" style={{ color: "var(--muted)" }}>All Sounds</Link>
          <span style={{ color: "var(--muted)" }}> / </span>
          {categoryHref ? (
            <Link href={categoryHref} style={{ color: "var(--text2)" }}>{sound.category}</Link>
          ) : (
            <span style={{ color: "var(--text2)" }}>{sound.category}</span>
          )}
        </div>

        {/* Hero */}
        <div className="detailHero">
          <div
            className="detailAvatar"
            onClick={() => play(sound)}
            style={{
              background: `${meta.color}18`,
              border: `2px solid ${meta.color}${isPlayingMain ? "60" : "30"}`,
              boxShadow: isPlayingMain ? `0 0 24px ${meta.color}40` : undefined,
            }}
          >
            {isPlayingMain
              ? <WaveBars color={meta.color} height={26} count={5} />
              : <span style={{ fontSize: 34 }}>{meta.emoji}</span>}
            <div className="avatarOverlay">
              {isPlayingMain
                ? <Square size={20} fill="#fff" style={{ color: "#fff" }} />
                : <Play size={20} fill="#fff" style={{ color: "#fff", marginLeft: 3 }} />}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={S.title}>{sound.name}</h1>
            <div style={{ ...S.catLine, color: meta.color }}>
              <span>{meta.emoji}</span>
              <span>{sound.category}</span>
              {sound.dur && <><span style={S.dot} /><span style={{ color: "var(--muted)" }}>{sound.dur}</span></>}
            </div>
          </div>
        </div>

        {description && <p style={S.description}>{description}</p>}

        <p style={S.favLine}>
          ❤️ <b>{fmt(likes)} users</b> liked this sound button
        </p>

        {/* Actions */}
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
          <button onClick={() => downloadSound(sound)} className="detailActionBtn primary">
            <Download size={16} /> Download MP3
          </button>
        </div>

        {/* Similar sounds */}
        {similar.length > 0 && (
          <section>
            <h2 style={S.h2}>Similar {sound.category} sounds</h2>
            <div className="soundList" style={{ padding: 0 }}>
              {similar.map((s) => (
                <SoundCard
                  key={s.id}
                  sound={s}
                  isPlaying={playingId === s.id}
                  onPlay={play}
                  onDownload={(sd) => downloadSound(sd)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={S.bottomCta}>
          <div style={S.ctaTitle}>Want more meme sounds?</div>
          <p style={{ color: "var(--text2)", fontSize: 15, margin: "0 0 24px", lineHeight: 1.6 }}>
            3,000+ meme sounds — instant playback, free MP3 download, no sign-up.
          </p>
          <Link href="/" style={S.ctaBtn}>Open Soundboard →</Link>
        </div>
      </main>

      <SiteFooter />
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
  dot: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    background: "var(--muted)",
    display: "inline-block",
  },
  description: {
    marginTop: 20,
    fontSize: 15.5,
    lineHeight: 1.7,
    color: "var(--text2)",
    maxWidth: 640,
  },
  favLine: {
    marginTop: 24,
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
