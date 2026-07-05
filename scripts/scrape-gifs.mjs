#!/usr/bin/env node
/**
 * GifVault Scraper
 * Downloads meme GIFs from the official Giphy API (developers.giphy.com)
 * and saves them locally.
 *
 * Requires a free Giphy API key: https://developers.giphy.com/dashboard/
 * Set GIPHY_API_KEY in .env.local before running.
 *
 * Usage:
 *   npm run scrape-gifs                 # scrape everything (may take a few min)
 *   npm run scrape-gifs -- --max 50     # limit to 50 gifs
 *   npm run scrape-gifs -- --rating pg  # stricter content rating (default: pg-13)
 *
 * Output:
 *   public/gifs/           GIF files served by Next.js at /gifs/*.gif
 *   data/gifs.json         Metadata consumed by /api/gifs
 *
 * After running, start the app with: npm run dev
 * To push to Firebase instead of local files, adapt scripts/upload-firebase.mjs.
 *
 * Note: Giphy's API terms require a "Powered By GIPHY" attribution badge
 * wherever this content is displayed. See https://developers.giphy.com/docs/optional-settings/#attribution
 */

import { createWriteStream, existsSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { fileURLToPath } from "url";

// ── Config ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");
const GIFS_DIR  = path.join(ROOT, "public", "gifs");
const DATA_FILE = path.join(ROOT, "data", "gifs.json");

const API_BASE   = "https://api.giphy.com/v1/gifs";
const PAGE_DELAY = 900;   // ms between API calls
const DL_DELAY   = 250;   // ms between GIF downloads
const MAX_FILE_BYTES = 8 * 1024 * 1024; // fall back to a smaller rendition above this

// Sources to pull — mirrors the category list in lib/gifMeta.ts
const SOURCES = [
  { category: "Trending",  type: "trending" },
  { category: "Memes",     type: "search", q: "memes" },
  { category: "Memes",     type: "search", q: "funny meme" },
  { category: "Reactions", type: "search", q: "reaction" },
  { category: "Funny",     type: "search", q: "funny" },
  { category: "Anime",     type: "search", q: "anime meme" },
  { category: "Gaming",    type: "search", q: "gaming meme" },
  { category: "Viral",     type: "search", q: "viral meme" },
  { category: "Animals",   type: "search", q: "funny animals" },
];

// ── CLI args ───────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const maxArg   = args.indexOf("--max");
const MAX_TOTAL = maxArg !== -1 ? parseInt(args[maxArg + 1]) || 200 : 200;
const ratingArg = args.indexOf("--rating");
const RATING    = ratingArg !== -1 ? args[ratingArg + 1] : "pg-13";

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const eq = line.indexOf("=");
      if (eq === -1 || line.startsWith("#")) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch { /* rely on process.env */ }
}

function slugToTitle(slug, fallback) {
  if (!slug) return fallback;
  // Giphy slugs look like "some-title-words-abc123XYZ" — drop the trailing id.
  const words = slug.split("-").slice(0, -1);
  const title = words.join(" ").trim();
  return title || fallback;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function buildUrl(source, apiKey) {
  const params = new URLSearchParams({ api_key: apiKey, limit: "50", rating: RATING, lang: "en" });
  if (source.type === "trending") return `${API_BASE}/trending?${params.toString()}`;
  params.set("q", source.q);
  return `${API_BASE}/search?${params.toString()}`;
}

async function downloadFile(url, dest) {
  if (existsSync(dest)) return true;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ws = createWriteStream(dest);
    await pipeline(Readable.fromWeb(res.body), ws);
    return true;
  } catch (e) {
    process.stderr.write(`  ✗ ${path.basename(dest)}: ${e.message}\n`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  await loadEnv();
  console.log("🎞️  GifVault Scraper (Giphy API)\n");

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    console.error("❌ GIPHY_API_KEY not set.\n   Get a free key at https://developers.giphy.com/dashboard/\n   then add it to .env.local");
    process.exit(1);
  }

  console.log(`   Targeting up to ${MAX_TOTAL} GIFs across ${SOURCES.length} sources (rating: ${RATING})\n`);

  mkdirSync(GIFS_DIR, { recursive: true });
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  let existing = [];
  try {
    existing = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch { /* no existing file */ }

  const existingIds = new Set(existing.map((g) => g.id));
  const collected    = [...existing];
  let downloaded = 0, skipped = 0, failed = 0;

  for (const source of SOURCES) {
    if (collected.length - existing.length >= MAX_TOTAL) break;

    const label = source.type === "trending" ? "trending" : `search "${source.q}"`;
    console.log(`📄 ${label} (${source.category})`);

    let items = [];
    try {
      const json = await fetchJson(buildUrl(source, apiKey));
      items = json.data ?? [];
      console.log(`   → got ${items.length} results`);
    } catch (e) {
      console.error(`   ✗ fetch failed: ${e.message}`);
      await sleep(PAGE_DELAY * 2);
      continue;
    }

    for (const item of items) {
      if (collected.length - existing.length >= MAX_TOTAL) break;
      if (existingIds.has(item.id)) { skipped++; continue; }

      const images = item.images ?? {};
      const original = images.original;
      const fallback = images.downsized_medium ?? images.fixed_height;
      const useOriginal = original?.url && (!original.size || parseInt(original.size) <= MAX_FILE_BYTES);
      const chosen = useOriginal ? original : (fallback ?? original);
      if (!chosen?.url) continue;

      const name     = slugToTitle(item.slug, item.title || "Meme GIF");
      const filename = `${item.id}.gif`;
      const dest     = path.join(GIFS_DIR, filename);

      process.stdout.write(`   ↓ ${filename.slice(0, 40).padEnd(40)}  `);
      const ok = await downloadFile(chosen.url, dest);

      if (ok) {
        existingIds.add(item.id);
        collected.push({
          id:         item.id,
          name,
          category:   source.category,
          filename,
          url:        `/gifs/${filename}`,
          width:      parseInt(chosen.width) || undefined,
          height:     parseInt(chosen.height) || undefined,
          likes:      0,
          dislikes:   0,
          downloads:  0,
          views:      0,
          source:     "giphy",
          sourceUrl:  item.url,
          createdAt:  new Date().toISOString(),
        });
        downloaded++;
        process.stdout.write("✓\n");
      } else {
        failed++;
        process.stdout.write("✗\n");
      }

      await sleep(DL_DELAY);
    }

    await sleep(PAGE_DELAY);
  }

  await writeFile(DATA_FILE, JSON.stringify(collected, null, 2));

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done!`);
  console.log(`   New downloads : ${downloaded}`);
  console.log(`   Already had   : ${skipped}`);
  console.log(`   Failed        : ${failed}`);
  console.log(`   Total in vault: ${collected.length}`);
  console.log(`\n   GIF files     → public/gifs/`);
  console.log(`   Metadata      → data/gifs.json`);
  console.log(`\n▶  Run the app  : npm run dev  (open /gifs)`);
  console.log(`\n⚠  Remember: Giphy's API terms require a "Powered By GIPHY" credit`);
  console.log(`   wherever this content is shown — see developers.giphy.com/docs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
