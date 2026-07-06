import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { posts, getPost, getRelatedPosts } from "@/lib/blog";
import { SiteFooter } from "@/components/SiteFooter";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://mememusic.fun/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://mememusic.fun/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      tags: ["meme sounds", post.category, "soundboard"],
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.description,
    },
  };
}

const CAT_COLORS: Record<string, string> = {
  Trending: "#ff4500",
  Bollywood: "#f59e0b",
  Anime: "#ec4899",
  "Creator Tips": "#06b6d4",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 2);
  const color = CAT_COLORS[post.category] ?? "#7c3aed";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "MemeMusic", url: "https://mememusic.fun" },
    publisher: {
      "@type": "Organization",
      name: "MemeMusic",
      logo: { "@type": "ImageObject", url: "https://mememusic.fun/og-image.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://mememusic.fun/blog/${slug}` },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <Link href="/" style={S.logo}>
            <span style={{ color: "#ff2d87" }}>meme</span>
            <span>music</span>
            <span style={{ color: "#ff2d87", fontSize: 11, opacity: 0.6, marginLeft: 2 }}>.fun</span>
          </Link>
          <nav style={S.nav}>
            <Link href="/blog" style={S.navLink}>Blog</Link>
            <Link href="/" style={S.navBtn}>Open Soundboard →</Link>
          </nav>
        </div>
      </header>

      <main style={S.main}>
        {/* Breadcrumb */}
        <div style={S.breadcrumb}>
          <Link href="/blog" style={{ color: "var(--muted)" }}>Blog</Link>
          <span style={{ color: "var(--muted)" }}> / </span>
          <span style={{ color: "var(--text2)" }}>{post.category}</span>
        </div>

        {/* Article header */}
        <article>
          <header style={S.articleHeader}>
            <div style={{ ...S.catBadge, color, background: `${color}18`, border: `1px solid ${color}30` }}>
              {post.emoji} {post.category}
            </div>
            <h1 style={S.title}>{post.title}</h1>
            <p style={S.desc}>{post.description}</p>
            <div style={S.meta}>
              <span>{fmt(post.date)}</span>
              <span style={S.dot} />
              <span>{post.readTime}</span>
            </div>
          </header>

          {/* Divider */}
          <div style={S.divider} />

          {/* Content */}
          <div style={S.content}>
            {post.sections.map((section, i) => {
              if (section.type === "p") return (
                <p key={i} style={S.para}>{section.text}</p>
              );
              if (section.type === "h2") return (
                <div key={i}>
                  <h2 style={S.h2}>{section.heading}</h2>
                  {section.text && <p style={S.para}>{section.text}</p>}
                </div>
              );
              if (section.type === "h3") return (
                <div key={i}>
                  <h3 style={S.h3}>{section.heading}</h3>
                  {section.text && <p style={S.para}>{section.text}</p>}
                  {section.href && (
                    <Link href={section.href} style={{ ...S.inlineSoundLink, color }}>
                      {section.linkLabel ?? "Listen & download →"}
                    </Link>
                  )}
                </div>
              );
              if (section.type === "ul") return (
                <div key={i} style={{ margin: "20px 0" }}>
                  {section.heading && <p style={{ ...S.para, fontWeight: 600, marginBottom: 10 }}>{section.heading}</p>}
                  <ul style={S.list}>
                    {section.items?.map((item, j) => (
                      <li key={j} style={S.listItem}>
                        <span style={{ color, marginRight: 8, flexShrink: 0 }}>→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
              if (section.type === "ol") return (
                <div key={i} style={{ margin: "20px 0" }}>
                  {section.heading && <p style={{ ...S.para, fontWeight: 600, marginBottom: 10 }}>{section.heading}</p>}
                  <ol style={S.list}>
                    {section.items?.map((item, j) => (
                      <li key={j} style={S.listItem}>
                        <span style={{ color, marginRight: 10, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{j + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              );
              if (section.type === "cta") return (
                <div key={i} style={S.ctaBox}>
                  <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 15 }}>{section.text}</p>
                  <Link href={section.href ?? "/"} style={{ ...S.ctaBtn, background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
                    {section.linkLabel ?? "Go to MemeMusic.fun →"}
                  </Link>
                </div>
              );
              return null;
            })}
          </div>
        </article>

        {/* Divider */}
        <div style={S.divider} />

        {/* Related posts */}
        {related.length > 0 && (
          <section>
            <h2 style={{ ...S.h2, marginBottom: 24 }}>Related Articles</h2>
            <div style={S.relatedGrid}>
              {related.map((rp) => {
                const rc = CAT_COLORS[rp.category] ?? "#7c3aed";
                return (
                  <Link key={rp.slug} href={`/blog/${rp.slug}`} style={S.relatedCard}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{rp.emoji}</div>
                    <div style={{ ...S.catBadge, color: rc, background: `${rc}18`, border: `1px solid ${rc}30`, marginBottom: 10 }}>
                      {rp.category}
                    </div>
                    <div style={S.relatedTitle}>{rp.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{rp.readTime}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={S.bottomCta}>
          <div style={S.ctaTitle}>Hear all the sounds we mentioned</div>
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
    maxWidth: 860,
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
  nav: { display: "flex", alignItems: "center", gap: 16 },
  navLink: { fontSize: 13.5, fontWeight: 500, color: "var(--text2)" },
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
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 20px 80px",
  },
  breadcrumb: {
    fontSize: 13,
    marginBottom: 28,
  },
  articleHeader: {
    marginBottom: 32,
  },
  catBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 16,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(26px, 5vw, 40px)",
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
    margin: "0 0 16px",
  },
  desc: {
    fontSize: 17,
    color: "var(--text2)",
    lineHeight: 1.65,
    margin: "0 0 20px",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--muted)",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    background: "var(--muted)",
    display: "inline-block",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "36px 0",
  },
  content: { lineHeight: 1.75 },
  para: {
    fontSize: 16,
    lineHeight: 1.75,
    color: "var(--text2)",
    margin: "0 0 20px",
  },
  h2: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(19px, 3vw, 24px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "40px 0 12px",
    color: "var(--text)",
  },
  h3: {
    fontSize: 16,
    fontWeight: 700,
    margin: "28px 0 8px",
    color: "var(--text)",
  },
  inlineSoundLink: {
    display: "inline-flex",
    fontSize: 13.5,
    fontWeight: 700,
    margin: "-8px 0 20px",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    fontSize: 15,
    color: "var(--text2)",
    lineHeight: 1.6,
  },
  ctaBox: {
    margin: "36px 0",
    padding: "28px 24px",
    borderRadius: 16,
    border: "1px solid rgba(255,45,135,0.2)",
    background: "rgba(255,45,135,0.04)",
    textAlign: "center",
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
  relatedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
    marginBottom: 48,
  },
  relatedCard: {
    padding: "20px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0f0f1e",
    color: "inherit",
    textDecoration: "none",
    display: "block",
    transition: "border-color 0.15s, transform 0.15s",
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.4,
    color: "var(--text)",
  },
  bottomCta: {
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: 20,
    border: "1px solid rgba(255,45,135,0.2)",
    background: "rgba(255,45,135,0.04)",
  },
  ctaTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 10,
    letterSpacing: "-0.02em",
  },
};
