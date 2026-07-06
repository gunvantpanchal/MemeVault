export interface Sound {
  id: string;
  slug?: string;
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

export const categorySlug = (c: string) => c.toLowerCase();
export const categoryFromSlug = (slug: string) =>
  CATEGORIES.find((c) => categorySlug(c) === slug.toLowerCase());

const CATEGORY_BLURBS: Record<string, string> = {
  Trending: "Trending sounds like this one are having a moment on Reels and Shorts right now — the kind of audio you hear on repeat until the next one takes over.",
  Memes: "It's part of MemeMusic's meme sound collection — a reaction-ready clip creators drop into videos for an instant laugh.",
  Bollywood: "Pulled from Bollywood's catalog of dialogue and background score, it's the kind of clip that instantly registers with any Hindi-speaking audience.",
  Anime: "Anime sound effects like this carry outsized emotional punch in a second or two, which is why they turn up in videos that have nothing to do with anime at all.",
  Gaming: "Straight from gaming culture, it's the kind of sound effect gamers and streamers reach for to punctuate a clip or stream highlight.",
  Viral: "This is one of the sounds currently spreading across TikTok, Reels and Shorts — use it while it's still fresh.",
  Reactions: "A reaction sound built for commentary videos — drop it in whenever your video needs to say what words can't.",
  FX: "A classic sound effect used to punctuate transitions, reveals, and comedic beats in short-form video.",
  Alerts: "An alert-style sound effect — sharp and attention-grabbing, built to cut through a busy feed.",
  Music: "A music clip creators use as a hook, transition, or backing track in their videos.",
};

/** Builds a 2-3 sentence, per-sound-unique description using real stats + category flavor text. */
export function soundBlurb(sound: { name: string; category: string; plays?: number; downloads?: number }): string {
  const flavor = CATEGORY_BLURBS[sound.category] ?? CATEGORY_BLURBS.Memes;
  const statBits: string[] = [];
  if (sound.plays) statBits.push(`played ${fmt(sound.plays)} times`);
  if (sound.downloads) statBits.push(`downloaded ${fmt(sound.downloads)} times`);
  const statLine = statBits.length
    ? `It's been ${statBits.join(" and ")} by creators on MemeMusic.`
    : `It's part of the ${sound.category} collection on MemeMusic.`;
  return `"${sound.name}" is a ${sound.category.toLowerCase()} meme sound effect you can play instantly or download free as an MP3 — no sign-up required. ${flavor} ${statLine}`;
}

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
