import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/lib/blog";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Blog — Meme Sound Guides & Creator Tips",
  description:
    "Guides on trending meme sounds, Bollywood audio for Reels, anime sound effects, and how to go viral using meme audio. Updated regularly.",
  alternates: { canonical: "https://mememusic.fun/blog" },
  openGraph: {
    title: "MemeMusic Blog — Meme Sound Guides & Creator Tips",
    description:
      "Guides on trending meme sounds, Bollywood audio for Reels, anime sound effects, and how to go viral using meme audio.",
    url: "https://mememusic.fun/blog",
  },
  twitter: {
    card: "summary",
    title: "MemeMusic Blog — Meme Sound Guides & Creator Tips",
    description:
      "Guides on trending meme sounds, Bollywood audio for Reels, anime sound effects, and how to go viral using meme audio.",
  },
};

const CAT_COLORS: Record<string, string> = {
  Trending:  "#ff4500",
  Bollywood: "#f59e0b",
  Anime:     "#ec4899",
  "Creator Tips": "#06b6d4",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <header style={S.header}>
        <Link href="/" style={S.backLink}>
          <span style={{ fontSize: 18 }}>←</span> Back to Soundboard
        </Link>
        <div style={S.logo}>
          <span style={{ color: "#ff2d87" }}>meme</span>
          <span>music</span>
          <span style={{ color: "#ff2d87", fontSize: 11, opacity: 0.6, marginLeft: 2 }}>.fun</span>
        </div>
      </header>

      <main style={S.main}>
        {/* Hero */}
        <div style={S.hero}>
          <h1 style={S.heroTitle}>
            <span style={{ color: "#ff2d87" }}>Meme Sound</span> Guides
          </h1>
          <p style={S.heroSub}>
            Creator tips, trending audio guides, and everything you need to win with meme sounds on Reels, Shorts &amp; beyond.
          </p>
        </div>

        {/* Post grid */}
        <div style={S.grid}>
          {posts.map((post) => {
            const color = CAT_COLORS[post.category] ?? "#7c3aed";
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={S.card}>
                <div style={{ ...S.cardEmoji, background: `${color}18`, border: `1px solid ${color}30` }}>
                  {post.emoji}
                </div>
                <div style={{ ...S.catBadge, color, background: `${color}18`, border: `1px solid ${color}30` }}>
                  {post.category}
                </div>
                <h2 style={S.cardTitle}>{post.title}</h2>
                <p style={S.cardDesc}>{post.description}</p>
                <div style={S.cardMeta}>
                  <span>{fmt(post.date)}</span>
                  <span style={S.dot} />
                  <span>{post.readTime}</span>
                </div>
                <div style={{ ...S.readMore, color }}>
                  Read article →
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div style={S.ctaBox}>
          <div style={S.ctaTitle}>Ready to try the sounds?</div>
          <p style={S.ctaSub}>Browse 3,000+ meme sounds — play instantly, download free, no sign-up.</p>
          <Link href="/" style={S.ctaBtn}>Open Soundboard →</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(6,6,16,0.97)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(20px)",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--muted)",
    fontSize: 13.5,
    fontWeight: 500,
    transition: "color 0.15s",
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
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "48px 20px 80px",
  },
  hero: {
    textAlign: "center",
    marginBottom: 56,
  },
  heroTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(32px, 6vw, 52px)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    margin: "0 0 16px",
    lineHeight: 1.1,
  },
  heroSub: {
    color: "var(--text2)",
    fontSize: 17,
    lineHeight: 1.7,
    maxWidth: 520,
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: 20,
    marginBottom: 64,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "24px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f0f1e",
    color: "inherit",
    textDecoration: "none",
    transition: "border-color 0.15s, transform 0.15s, box-shadow 0.2s",
    cursor: "pointer",
  },
  cardEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    flexShrink: 0,
  },
  catBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 700,
    width: "fit-content",
  },
  cardTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.3,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  cardDesc: {
    color: "var(--text2)",
    fontSize: 14,
    lineHeight: 1.65,
    margin: 0,
    flex: 1,
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "var(--muted)",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    background: "var(--muted)",
    display: "inline-block",
  },
  readMore: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },
  ctaBox: {
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: 20,
    border: "1px solid rgba(255,45,135,0.2)",
    background: "rgba(255,45,135,0.04)",
  },
  ctaTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 10,
  },
  ctaSub: {
    color: "var(--text2)",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 1.6,
  },
  ctaBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, #ff2d87, #c4206d)",
    color: "#fff",
    borderRadius: 12,
    padding: "12px 28px",
    fontWeight: 700,
    fontSize: 15,
    boxShadow: "0 4px 20px rgba(255,45,135,0.3)",
    transition: "opacity 0.15s",
  },
};
