import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "MemeMusic.fun is a free meme soundboard and GIF vault for creators — 3,000+ trending meme sounds, instant playback, and no sign-up required.",
  alternates: { canonical: "https://mememusic.fun/about" },
};

export default function AboutPage() {
  return (
    <StaticPage
      title="About MemeMusic"
      subtitle="A free home for the sounds and GIFs that make the internet funnier."
    >
      <h2>What we do</h2>
      <p>
        MemeMusic.fun is a meme soundboard and GIF vault built for creators, editors, and anyone
        who&rsquo;s ever needed a specific meme sound <em>right now</em>. We host 3,000+ trending
        meme sound effects — Indian memes, Bollywood dialogue, anime clips, gaming reactions, and
        viral audio — that you can play instantly in your browser or download as an MP3, no
        account required. Alongside the soundboard, GifVault gives you the same instant-preview,
        free-download experience for meme GIFs.
      </p>

      <h2>Why we built it</h2>
      <p>
        Most platforms let you use a trending sound inside their own app but won&rsquo;t let you
        take the actual audio file with you. If you edit in CapCut, Premiere, or DaVinci Resolve,
        that&rsquo;s a dead end. We built MemeMusic so creators could grab the clip they need,
        drop it straight into their timeline, and get back to editing — without hunting through
        five different apps or dealing with a login wall.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>Browse or search sounds and GIFs by category — Trending, Bollywood, Anime, Gaming, Reactions, and more.</li>
        <li>Tap to preview instantly, no download needed to hear it first.</li>
        <li>Download the file for free when you&rsquo;re ready to use it.</li>
        <li>Creators can upload their own sounds or GIFs to share with the community.</li>
      </ul>

      <h2>Content &amp; moderation</h2>
      <p>
        Sounds and GIFs on MemeMusic come from user uploads and public sources. We review
        submissions on an ongoing basis and remove content that&rsquo;s infringing, unlawful, or
        otherwise doesn&rsquo;t belong here — see our{" "}
        <Link href="/terms-of-service">Terms of Service</Link> for details. If something you own
        appears here and shouldn&rsquo;t, or you spot content that&rsquo;s inappropriate,{" "}
        <Link href="/contact">let us know</Link> and we&rsquo;ll take a look.
      </p>

      <h2>Support the site</h2>
      <p>
        MemeMusic is free to use, with no sign-up and no paywall. The site is supported by
        advertising — see our <Link href="/privacy-policy">Privacy Policy</Link> for details on
        how ads and analytics work here.
      </p>
    </StaticPage>
  );
}
