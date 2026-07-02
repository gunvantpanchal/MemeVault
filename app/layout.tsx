import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-BF06CFC91Z";

const BASE_URL = "https://mememusic.fun";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  applicationName: "MemeMusic",
  title: {
    default: "MemeMusic — Meme Soundboard | Play & Download Meme Sounds",
    template: "%s | MemeMusic",
  },
  description:
    "The #1 meme soundboard. Play & download 230+ trending meme sounds — Indian memes, Bollywood, anime, gaming, viral clips & more. Instant playback, free download.",
  keywords: [
    "meme soundboard",
    "meme sounds",
    "meme sound effects",
    "Indian meme sounds",
    "funny sound effects",
    "viral sounds",
    "anime sounds",
    "Bollywood meme sounds",
    "gaming sounds",
    "meme audio download",
    "soundboard online",
    "free meme sounds",
    "meme audio",
    "sound effects board",
    "trending meme sounds",
    "meme music",
    "mememusic",
    "online soundboard",
    "hindi meme sounds",
    "ringtone sounds",
  ],
  authors: [{ name: "MemeMusic", url: BASE_URL }],
  creator: "MemeMusic",
  publisher: "MemeMusic",
  category: "entertainment",
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "RZIpgqNZjbE7-J7t4cHGzIBrx3FXtf4ENNCi9juLVyY",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["en_US"],
    url: BASE_URL,
    siteName: "MemeMusic",
    title: "MemeMusic — Meme Soundboard | Play & Download Meme Sounds",
    description:
      "Play & download 230+ trending meme sounds — Indian memes, Bollywood, anime, gaming, viral clips & more. Free, instant, no sign-up.",
    images: [
      {
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "MemeMusic — Meme Soundboard",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MemeMusic — Meme Soundboard | Play & Download Meme Sounds",
    description:
      "Play & download 230+ trending meme sounds — Indian memes, Bollywood, anime, gaming & more. Free & instant.",
    images: [`${BASE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "MemeMusic",
      description: "The #1 meme soundboard — play & download trending meme sounds.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${BASE_URL}/#app`,
      name: "MemeMusic Soundboard",
      url: BASE_URL,
      applicationCategory: "EntertainmentApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Play and download 230+ trending meme sounds including Indian memes, Bollywood, anime, gaming and viral clips. Free meme soundboard, no sign-up required.",
      screenshot: `${BASE_URL}/og-image.png`,
      featureList: [
        "230+ meme sound effects",
        "Instant audio playback",
        "Free MP3 download",
        "Indian & Bollywood memes",
        "Anime & gaming sounds",
        "No sign-up required",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#org`,
      name: "MemeMusic",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/og-image.png`,
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#060610" />
        <meta name="color-scheme" content="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { page_path: window.location.pathname });
          `}
        </Script>
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="FXZH8LnMEcYnUNetW1i68w"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
