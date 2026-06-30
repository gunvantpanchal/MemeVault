#!/usr/bin/env node
/**
 * MemeVault Scraper
 * Downloads meme sounds from myinstants.com and saves them locally.
 *
 * Usage:
 *   npm run scrape            # scrape everything (may take 5-10 min)
 *   npm run scrape -- --max 50  # limit to 50 sounds
 *
 * Output:
 *   public/sounds/          MP3 files served by Next.js at /sounds/*.mp3
 *   data/sounds.json        Metadata consumed by /api/sounds
 *
 * After running, start the app with: npm run dev
 * To push to Firebase instead of local files: npm run upload
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
const SOUNDS_DIR = path.join(ROOT, "public", "sounds");
const DATA_FILE  = path.join(ROOT, "data", "sounds.json");

const BASE_URL   = "https://www.myinstants.com";
const PAGE_DELAY = 900;   // ms between page fetches
const DL_DELAY   = 250;   // ms between MP3 downloads

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Pages to scrape — ordered by priority
const PAGES = [
  // Trending India (5 pages)
  ...Array.from({ length: 5 }, (_, i) => ({
    url: `${BASE_URL}/en/index/in/${i > 0 ? `?page=${i + 1}` : ""}`,
    category: "Trending",
  })),
  // Meme category search
  { url: `${BASE_URL}/en/search/?name=meme`,        category: "Memes" },
  { url: `${BASE_URL}/en/search/?name=meme&page=2`, category: "Memes" },
  { url: `${BASE_URL}/en/search/?name=funny`,       category: "Memes" },
  // Regional
  { url: `${BASE_URL}/en/search/?name=bollywood`,   category: "Bollywood" },
  { url: `${BASE_URL}/en/search/?name=hindi`,       category: "Bollywood" },
  // Anime
  { url: `${BASE_URL}/en/search/?name=anime`,       category: "Anime" },
  // Viral / gaming
  { url: `${BASE_URL}/en/search/?name=viral`,       category: "Viral" },
  { url: `${BASE_URL}/en/search/?name=gaming`,      category: "Gaming" },
  { url: `${BASE_URL}/en/search/?name=vine`,        category: "Memes" },
];

// ── CLI args ───────────────────────────────────────────────────────────────
const maxArg   = process.argv.indexOf("--max");
const MAX_TOTAL = maxArg !== -1 ? parseInt(process.argv[maxArg + 1]) || 200 : 200;

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function detectCategory(name, defaultCat) {
  const n = name.toLowerCase();
  if (/\b(anime|naruto|goku|pokemon|pikachu|sasuke|demon slayer|jujutsu|jjk|bleach|one piece|luffy)\b/.test(n))
    return "Anime";
  if (/\b(bollywood|hindi|desi|filmy|shahrukh|salman|amitabh|bahubali|raanjhanaa|singham)\b/.test(n))
    return "Bollywood";
  if (/\b(gaming|minecraft|roblox|among us|pubg|valorant|fortnite|gta|free fire)\b/.test(n))
    return "Gaming";
  if (/\b(tiktok|viral|reel|instagram|youtube)\b/.test(n))
    return "Viral";
  return defaultCat;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── HTML extraction ────────────────────────────────────────────────────────
// myinstants format (confirmed 2025):
//   share button: onclick="share('Sound Name', 'https://.../instant/slug/', '/media/sounds/x.mp3', 'slug')"
// We pull name + MP3 path from the share() onclick — one regex, zero ambiguity.
async function parseSounds(html, defaultCat) {
  return parseSoundsRegex(html, defaultCat);
}

function parseSoundsRegex(html, defaultCat) {
  const sounds = [];
  const seen   = new Set();

  // Match: onclick="share('Name', 'pageUrl', '/media/sounds/x.mp3', 'slug')"
  const re = /onclick="share\('([^']+)',\s*'[^']+',\s*'(\/media\/sounds\/[^']+\.mp3)'/g;

  let m;
  while ((m = re.exec(html)) !== null) {
    const name      = m[1].trim();
    const soundPath = m[2];
    const filename  = path.basename(soundPath);

    if (!name || name.length > 120) continue;
    if (seen.has(filename)) continue;
    seen.add(filename);

    sounds.push({ soundPath, filename, name, category: detectCategory(name, defaultCat) });
  }

  return sounds;
}

// ── Download MP3 ───────────────────────────────────────────────────────────
async function downloadMp3(soundPath, filename) {
  const dest = path.join(SOUNDS_DIR, filename);
  if (existsSync(dest)) return true; // skip if already downloaded

  try {
    const res = await fetch(`${BASE_URL}${soundPath}`, {
      headers: { ...HEADERS, Referer: BASE_URL },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ws = createWriteStream(dest);
    await pipeline(Readable.fromWeb(res.body), ws);
    return true;
  } catch (e) {
    process.stderr.write(`  ✗ ${filename}: ${e.message}\n`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🎭 MemeVault Scraper\n");
  console.log(`   Targeting up to ${MAX_TOTAL} sounds across ${PAGES.length} pages\n`);

  mkdirSync(SOUNDS_DIR, { recursive: true });
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  // Load existing sounds so we can merge without duplicates
  let existing = [];
  try {
    existing = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch { /* no existing file */ }

  const existingFiles = new Set(existing.map((s) => s.filename));
  const collected     = [...existing];
  let downloaded = 0, skipped = 0, failed = 0;

  for (const page of PAGES) {
    if (collected.length - existing.length >= MAX_TOTAL) break;

    console.log(`📄 ${page.url}`);
    let sounds = [];
    try {
      const html = await fetchHtml(page.url);
      sounds = await parseSounds(html, page.category);
      console.log(`   → parsed ${sounds.length} sounds`);
    } catch (e) {
      console.error(`   ✗ fetch failed: ${e.message}`);
      await sleep(PAGE_DELAY * 2);
      continue;
    }

    for (const s of sounds) {
      if (collected.length - existing.length >= MAX_TOTAL) break;
      if (existingFiles.has(s.filename)) { skipped++; continue; }

      process.stdout.write(`   ↓ ${s.filename.slice(0, 40).padEnd(40)}  `);
      const ok = await downloadMp3(s.soundPath, s.filename);

      if (ok) {
        existingFiles.add(s.filename);
        collected.push({
          id:        s.filename.replace(/\.mp3$/, ""),
          name:      s.name,
          category:  s.category,
          filename:  s.filename,
          url:       `/sounds/${s.filename}`,
          plays:     Math.floor(Math.random() * 50000) + 2000,
          dur:       "",  // will be filled by upload script or client-side
          createdAt: new Date().toISOString(),
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
  console.log(`\n   Audio files   → public/sounds/`);
  console.log(`   Metadata      → data/sounds.json`);
  console.log(`\n▶  Run the app  : npm run dev`);
  console.log(`☁  Push to Firebase: npm run upload\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
