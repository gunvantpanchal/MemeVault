import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGifById, getSimilarGifs, type GifDoc } from "@/lib/gifs";
import type { Gif } from "@/lib/gifMeta";
import GifDetailClient from "@/components/GifDetailClient";

const BASE_URL = "https://mememusic.fun";

function toGif(doc: GifDoc): Gif {
  return { ...doc, kind: "file", url: doc.firebaseUrl || doc.url };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const gif = await getGifById(id);
  if (!gif) return {};

  const title = `${gif.name} — Meme GIF`;
  const description = `View and download "${gif.name}", a ${gif.category} meme GIF. Free download, instant preview, no sign-up required.`;
  const url = `${BASE_URL}/gifs/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function GifPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gifDoc = await getGifById(id);
  if (!gifDoc) notFound();

  const similarDocs = await getSimilarGifs(gifDoc, 8);
  const gif = toGif(gifDoc);
  const similar = similarDocs.map(toGif);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: gif.name,
    contentUrl: gif.url,
    genre: gif.category,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: gif.likes ?? 0,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/gifs/${id}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GifDetailClient gif={gif} similar={similar} />
    </>
  );
}
