export interface Sound {
  id: string;
  name: string;
  category: string;
  dur?: string;
  kind: "file" | "synth";
  synthId?: string;
  url?: string;
  filename?: string;
  firebaseUrl?: string;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  plays?: number;
}

export const CAT_META: Record<string, { emoji: string; color: string }> = {
  Trending:  { emoji: "🔥", color: "#ff4500" },
  Memes:     { emoji: "😂", color: "#8b5cf6" },
  Bollywood: { emoji: "🎬", color: "#f59e0b" },
  Anime:     { emoji: "🎌", color: "#ec4899" },
  Gaming:    { emoji: "🎮", color: "#10b981" },
  Viral:     { emoji: "📱", color: "#06b6d4" },
  FX:        { emoji: "💥", color: "#f97316" },
  Reactions: { emoji: "😮", color: "#a78bfa" },
  Alerts:    { emoji: "🚨", color: "#ef4444" },
  Game:      { emoji: "🕹️", color: "#22c55e" },
  Music:     { emoji: "🎵", color: "#e879f9" },
};

export const getCat = (c?: string) => CAT_META[c ?? ""] ?? { emoji: "🔊", color: "#6366f1" };

// Stable sidebar/chip categories (the feed is server-paginated, so we can't
// derive these from the currently-loaded subset).
export const CATEGORIES = [
  "All", "Trending", "Memes", "Bollywood", "Anime",
  "Gaming", "Viral", "Reactions", "FX", "Alerts", "Music",
];

export function fmt(n: number): string {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function parseDurMs(dur?: string): number {
  if (!dur) return 2800;
  const [m, s] = dur.split(":").map(Number);
  return ((m || 0) * 60 + (s || 0)) * 1000 + 300;
}
