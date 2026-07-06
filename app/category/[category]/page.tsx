import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSoundsByCategory, getSoundCategoryCounts } from "@/lib/sounds";
import { CATEGORIES, categorySlug, categoryFromSlug, getCat, fmt } from "@/lib/soundMeta";
import { SiteFooter } from "@/components/SiteFooter";

const BASE_URL = "https://mememusic.fun";
const LIST_LIMIT = 300;

export async function generateStaticParams() {
  const counts = await getSoundCategoryCounts();
  return CATEGORIES
    .filter((c) => c !== "All" && (counts[c] ?? 0) > 0)
    .map((c) => ({ category: categorySlug(c) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category: slugParam } = await params;
  const category = categoryFromSlug(slugParam);
  if (!category) return {};

  const { total } = await getSoundsByCategory(category, 1);
  const title = `${category} Meme Sounds — Play & Download Free`;
  const description = `${fmt(total)}+ ${category.toLowerCase()} meme sounds — instant playback, free MP3 download, no sign-up. Browse the full ${category} soundboard on MemeMusic.`;
  const url = `${BASE_URL}/category/${categorySlug(category)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slugParam } = await params;
  const category = categoryFromSlug(slugParam);
  if (!category) notFound();

  const { sounds, total } = await getSoundsByCategory(category, LIST_LIMIT);
  if (total === 0) notFound();

  const meta = getCat(category);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category} meme sounds`,
    itemListElement: sounds.slice(0, 100).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/sound/${s.slug}`,
      name: s.name,
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
        <div style={S.breadcrumb}>
          <Link href="/" style={{ color: "var(--muted)" }}>All Sounds</Link>
          <span style={{ color: "var(--muted)" }}> / </span>
          <span style={{ color: "var(--text2)" }}>{category}</span>
        </div>

        <div style={S.hero}>
          <div style={{ ...S.heroEmoji, background: `${meta.color}18`, border: `2px solid ${meta.color}30` }}>
            {meta.emoji}
          </div>
          <div>
            <h1 style={S.title}>{category} Meme Sounds</h1>
            <p style={S.sub}>{fmt(total)} sound{total === 1 ? "" : "s"} — free to play and download, no sign-up.</p>
          </div>
        </div>

        <ul style={S.list}>
          {sounds.map((s) => (
            <li key={s.id}>
              <Link href={`/sound/${s.slug}`} style={S.item}>
                <span style={{ ...S.itemDot, background: meta.color }} />
                <span style={S.itemName}>{s.name}</span>
                {!!s.plays && <span style={S.itemStat}>{fmt(s.plays)} plays</span>}
              </Link>
            </li>
          ))}
        </ul>

        {total > sounds.length && (
          <p style={S.moreNote}>
            Showing the top {sounds.length} of {fmt(total)} {category.toLowerCase()} sounds by popularity.{" "}
            <Link href="/" style={{ color: meta.color, fontWeight: 700 }}>Search the full soundboard →</Link>
          </p>
        )}

        <div style={S.ctaBox}>
          <div style={S.ctaTitle}>Want the full soundboard?</div>
          <p style={{ color: "var(--text2)", fontSize: 15, margin: "0 0 24px", lineHeight: 1.6 }}>
            3,000+ meme sounds across every category — instant playback, free MP3 download.
          </p>
          <Link href="/" style={S.ctaBtn}>Open Soundboard →</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
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
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    marginBottom: 32,
  },
  heroEmoji: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 28,
    flexShrink: 0,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(24px, 4.5vw, 34px)",
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
    margin: "0 0 6px",
  },
  sub: {
    color: "var(--text2)",
    fontSize: 15,
    margin: 0,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 8,
    marginBottom: 8,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f0f1e",
    color: "inherit",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  itemName: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemStat: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--muted)",
    flexShrink: 0,
  },
  moreNote: {
    fontSize: 13.5,
    color: "var(--muted)",
    margin: "20px 0 48px",
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
