import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://meme-vault-six.vercel.app"),
  title: {
    default: "MemeVault — Meme Sound Collection",
    template: "%s | MemeVault",
  },
  description:
    "The ultimate meme soundboard. Trending Indian memes, anime sounds, viral clips, Bollywood, gaming & more — all in one vault. Play, download & share instantly.",
  keywords: [
    "meme sounds",
    "meme soundboard",
    "meme sound effects",
    "Indian meme sounds",
    "funny sound effects",
    "viral sounds",
    "anime sounds",
    "Bollywood meme sounds",
    "gaming sounds",
    "meme audio download",
    "MemeVault",
  ],
  authors: [{ name: "MemeVault" }],
  creator: "MemeVault",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://meme-vault-six.vercel.app",
    siteName: "MemeVault",
    title: "MemeVault — Meme Sound Collection",
    description:
      "Play and download trending meme sounds — Indian memes, anime, Bollywood, viral clips and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MemeVault — Meme Sound Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MemeVault — Meme Sound Collection",
    description:
      "Play and download trending meme sounds — Indian memes, anime, Bollywood, viral clips and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
