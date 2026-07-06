import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSoundBySlug, getSoundById, getSimilarSounds, type SoundDoc } from "@/lib/sounds";
import { soundBlurb, categorySlug } from "@/lib/soundMeta";
import type { Sound } from "@/lib/soundMeta";
import SoundDetailClient from "@/components/SoundDetailClient";

const BASE_URL = "https://mememusic.fun";
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

function toSound(doc: SoundDoc): Sound {
  return { ...doc, kind: "file", url: doc.firebaseUrl || doc.url };
}

async function resolveSound(slug: string): Promise<SoundDoc | null> {
  const bySlug = await getSoundBySlug(slug);
  if (bySlug) return bySlug;
  // Legacy links from before slugs existed used the raw Mongo id.
  if (OBJECT_ID_RE.test(slug)) {
    const byId = await getSoundById(slug);
    if (byId?.slug) permanentRedirect(`/sound/${byId.slug}`);
    if (byId) return byId; // slug not backfilled yet — render under the legacy id rather than 404
  }
  return null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const sound = await getSoundBySlug(slug);
  if (!sound) return {};

  const title = `${sound.name} — Meme Sound`;
  const description = `Play and download "${sound.name}", a ${sound.category} meme sound. Free MP3 download, instant playback, no sign-up required.`;
  const url = `${BASE_URL}/sound/${sound.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const soundDoc = await resolveSound(slug);
  if (!soundDoc) notFound();

  const similarDocs = await getSimilarSounds(soundDoc, 8);
  const sound = toSound(soundDoc);
  const similar = similarDocs.map(toSound);
  const description = soundBlurb(soundDoc);
  const catHref = `/category/${categorySlug(soundDoc.category)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    name: sound.name,
    description,
    contentUrl: sound.url,
    genre: sound.category,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: sound.likes ?? 0,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/sound/${soundDoc.slug}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SoundDetailClient sound={sound} similar={similar} description={description} categoryHref={catHref} />
    </>
  );
}
