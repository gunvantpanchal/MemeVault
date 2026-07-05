export interface Gif {
  id: string;
  name: string;
  category: string;
  kind: "file";
  url?: string;
  firebaseUrl?: string;
  filename?: string;
  width?: number;
  height?: number;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  views?: number;
}

export const CAT_META: Record<string, { emoji: string; color: string }> = {
  Trending:  { emoji: "🔥", color: "#ff4500" },
  Memes:     { emoji: "😂", color: "#8b5cf6" },
  Reactions: { emoji: "😮", color: "#a78bfa" },
  Anime:     { emoji: "🎌", color: "#ec4899" },
  Gaming:    { emoji: "🎮", color: "#10b981" },
  Viral:     { emoji: "📱", color: "#06b6d4" },
  Funny:     { emoji: "🤣", color: "#f59e0b" },
  Animals:   { emoji: "🐾", color: "#22c55e" },
};

export const getCat = (c?: string) => CAT_META[c ?? ""] ?? { emoji: "🎞️", color: "#6366f1" };

// Stable sidebar/chip categories (the feed is server-paginated, so we can't
// derive these from the currently-loaded subset).
export const CATEGORIES = [
  "All", "Trending", "Memes", "Reactions", "Funny", "Anime", "Gaming", "Viral", "Animals",
];

export function fmt(n: number): string {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
