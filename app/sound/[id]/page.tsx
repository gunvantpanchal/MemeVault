import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSoundById, getSimilarSounds, type SoundDoc } from "@/lib/sounds";
import type { Sound } from "@/lib/soundMeta";
import SoundDetailClient from "@/components/SoundDetailClient";

const BASE_URL = "https://mememusic.fun";

function toSound(doc: SoundDoc): Sound {
  return { ...doc, kind: "file", url: doc.firebaseUrl || doc.url };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const sound = await getSoundById(id);
  if (!sound) return {};

  const title = `${sound.name} — Meme Sound`;
  const description = `Play and download "${sound.name}", a ${sound.category} meme sound. Free MP3 download, instant playback, no sign-up required.`;
  const url = `${BASE_URL}/sound/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const soundDoc = await getSoundById(id);
  if (!soundDoc) notFound();

  const similarDocs = await getSimilarSounds(soundDoc, 8);
  const sound = toSound(soundDoc);
  const similar = similarDocs.map(toSound);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    name: sound.name,
    contentUrl: sound.url,
    genre: sound.category,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: sound.likes ?? 0,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/sound/${id}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SoundDetailClient sound={sound} similar={similar} />
    </>
  );
}
