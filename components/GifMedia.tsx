import React from "react";

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export function GifMedia({
  url, name, autoPlay = true, className,
}: {
  url?: string;
  name: string;
  autoPlay?: boolean;
  className?: string;
}) {
  if (!url) return null;

  if (isVideoUrl(url)) {
    return (
      <video
        className={className}
        src={url}
        autoPlay={autoPlay}
        loop
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={url} alt={name} loading="lazy" />;
}
