import Link from "next/link";
import type { CSSProperties } from "react";
import { categorySlug } from "@/lib/soundMeta";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];

// Kept as a static list (SiteFooter renders inside client components, so it can't
// fetch live counts) — only categories currently populated in the DB. Update this
// list if a currently-empty category (Reactions, FX, Alerts, Music) gets sounds.
const CATEGORY_LINKS = ["Memes", "Trending", "Bollywood", "Viral", "Gaming", "Anime"].map((c) => ({
  href: `/category/${categorySlug(c)}`,
  label: `${c} Sounds`,
}));

export function SiteFooter() {
  return (
    <footer style={S.footer}>
      <nav style={{ ...S.links, ...S.catLinks }}>
        {CATEGORY_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="footerLink">
            {l.label}
          </Link>
        ))}
      </nav>
      <nav style={S.links}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="footerLink">
            {l.label}
          </Link>
        ))}
      </nav>
      <p style={S.copy}>
        © {new Date().getFullYear()} MemeMusic.fun — meme sounds &amp; GIFs are curated from user submissions and public sources; rights belong to their original creators.
      </p>
    </footer>
  );
}

const S: Record<string, CSSProperties> = {
  footer: {
    borderTop: "1px solid var(--border)",
    padding: "24px 20px 40px",
    marginTop: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    textAlign: "center",
  },
  links: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "8px 20px",
  },
  catLinks: {
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
    fontSize: 12.5,
  },
  copy: {
    fontSize: 12,
    color: "var(--muted)",
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 560,
  },
};
