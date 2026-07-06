import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";

export function StaticPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
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
        <h1 style={S.title}>{title}</h1>
        {subtitle && <p style={S.subtitle}>{subtitle}</p>}
        {updated && <p style={S.updated}>Last updated: {updated}</p>}

        <div style={S.divider} />

        <div className="legalContent">{children}</div>
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
    maxWidth: 780,
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
    whiteSpace: "nowrap",
  },
  main: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "48px 20px 60px",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(28px, 5vw, 42px)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
    margin: "0 0 14px",
  },
  subtitle: {
    fontSize: 16.5,
    color: "var(--text2)",
    lineHeight: 1.65,
    margin: "0 0 8px",
    maxWidth: 620,
  },
  updated: {
    fontSize: 12.5,
    color: "var(--muted)",
    margin: "8px 0 0",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "32px 0 0",
  },
};
