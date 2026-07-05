import type { Metadata } from "next";
import GifVault from "@/components/GifVault";

export const metadata: Metadata = {
  title: "GifVault — Free Meme GIFs, Instant Preview & Download",
  description: "Browse and download free meme GIFs and clips. Instant preview, no sign-up required.",
};

export default function Page() {
  return <GifVault />;
}
