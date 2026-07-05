#!/usr/bin/env node
/**
 * GifVault Sync — reactiongifs.com  (scrape → Firebase Storage → MongoDB)
 *
 * reactiongifs.com is a plain server-rendered WordPress site — no API key,
 * no JS execution needed (unlike giphy.com, which only renders ~15 GIFs
 * without running its client-side app). robots.txt allows crawling with a
 * 10s delay between page requests, which this script honors.
 *
 * For every NEW gif (deduped by source URL against MongoDB), the file is
 * streamed straight to Firebase Storage and the metadata doc inserted.
 * Nothing is written to data/gifs.json — the live app reads from MongoDB.
 * Safe to re-run: dedupe is by `sourceUrl` (unique index).
 *
 * Prereqs:
 *   - serviceAccount.json in project root (Firebase Admin key)
 *   - .env.local with NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET + MONGODB_URI
 *
 * Usage:
 *   node scripts/sync-reactiongifs.mjs                # add up to 1000 new gifs
 *   node scripts/sync-reactiongifs.mjs --max 200      # cap new gifs
 *   node scripts/sync-reactiongifs.mjs --dry-run      # discover only, no upload
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BASE_URL = "https://www.reactiongifs.com";
const PAGE_DELAY = 10_000; // robots.txt: Crawl-delay: 10 — honored for page requests
const DL_DELAY = 350; // normal page-load pace for the images a real visit would fetch
const MAX_PAGES = 400; // site tops out a bit above 300; guards against an infinite loop
const FETCH_TIMEOUT = 20_000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// Lightweight keyword routing — the site is all reaction gifs by nature,
// but titles occasionally skew clearly into another bucket.
function detectCategory(title) {
  const t = title.toLowerCase();
  if (/\b(anime|naruto|goku|pokemon|pikachu|dragon ball)\b/.test(t)) return "Anime";
  if (/\b(minecraft|roblox|among us|pubg|valorant|fortnite|gta|xbox|playstation|video game)\b/.test(t)) return "Gaming";
  if (/\b(cat|dog|puppy|kitten|animal|bird|hamster)\b/.test(t)) return "Animals";
  if (/\b(meme|dank)\b/.test(t)) return "Memes";
  if (/\b(tiktok|viral|instagram)\b/.test(t)) return "Viral";
  return "Reactions";
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const maxIdx = args.indexOf("--max");
const MAX_NEW = maxIdx !== -1 ? parseInt(args[maxIdx + 1]) || 1000 : 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function decodeEntities(s) {
  return s
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchHtml(url) {
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseGifs(html) {
  const out = [];
  const re = /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const src = /src="([^"]+\.gif)"/.exec(tag)?.[1];
    const alt = /alt="([^"]*)"/.exec(tag)?.[1];
    if (!src) continue;
    const name = decodeEntities(alt || path.basename(src, ".gif").replace(/[-_]+/g, " "));
    out.push({ url: src, name });
  }
  return out;
}

async function downloadBuffer(url) {
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await loadEnv();
  console.log("🎞️  GifVault Sync (reactiongifs.com)\n");
  console.log(`   Target: up to ${MAX_NEW} NEW gifs${DRY_RUN ? "  [DRY RUN]" : ""}`);
  console.log(`   Honoring robots.txt Crawl-delay: 10s between page requests\n`);

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const mongoUri = process.env.MONGODB_URI;
  if (!bucketName) { console.error("❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set"); process.exit(1); }
  if (!mongoUri) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

  // ── MongoDB ──
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const col = mongo.db("memevault").collection("gifs");
  await col.createIndex({ sourceUrl: 1 }, { unique: true, sparse: true }).catch(() => {});

  const existing = await col.find({}, { projection: { sourceUrl: 1 } }).toArray();
  const seen = new Set(existing.map((d) => d.sourceUrl).filter(Boolean));
  console.log(`   Live DB has ${seen.size} synced gifs — these will be skipped.\n`);

  // ── Firebase Admin ──
  let bucket = null;
  if (!DRY_RUN) {
    const admin = (await import("firebase-admin")).default;
    const saPath = path.join(ROOT, "serviceAccount.json");
    if (!existsSync(saPath)) { console.error("❌ serviceAccount.json missing"); process.exit(1); }
    const sa = JSON.parse(await readFile(saPath, "utf8"));
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: bucketName });
    }
    bucket = admin.storage().bucket();
  }

  let added = 0, failed = 0, scanned = 0;

  for (let page = 1; page <= MAX_PAGES && added < MAX_NEW; page++) {
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;

    let gifs;
    try {
      gifs = parseGifs(await fetchHtml(url));
    } catch (e) {
      console.error(`   ✗ page ${page}: ${e.message} — stopping (likely end of pagination)`);
      break;
    }

    if (gifs.length === 0) { console.log(`   page ${page}: no gifs found — stopping`); break; }
    scanned += gifs.length;

    const fresh = gifs.filter((g) => !seen.has(g.url));
    console.log(`📄 page ${page} — ${fresh.length}/${gifs.length} new`);

    for (const g of fresh) {
      if (added >= MAX_NEW) break;
      seen.add(g.url);

      if (DRY_RUN) { console.log(`   + ${g.name}`); added++; continue; }

      const category = detectCategory(g.name);
      const filename = `reactiongifs-${path.basename(g.url)}`;
      const storagePath = `gifs/${filename}`;

      try {
        const buf = await downloadBuffer(g.url);
        const file = bucket.file(storagePath);
        await file.save(buf, { metadata: { contentType: "image/gif" }, public: true, resumable: false });
        const firebaseUrl = file.publicUrl();

        await col.insertOne({
          name: g.name,
          category,
          filename,
          firebaseUrl,
          storagePath,
          source: "reactiongifs.com",
          sourceUrl: g.url,
          likes: 0, dislikes: 0, downloads: 0, views: 0,
          createdAt: new Date(),
        });
        added++;
        if (added % 25 === 0) console.log(`   … ${added} added so far`);
      } catch (e) {
        if (e.code === 11000) { /* duplicate — already inserted */ }
        else { failed++; process.stderr.write(`   ✗ ${g.url}: ${e.message}\n`); }
      }
      await sleep(DL_DELAY);
    }

    if (added >= MAX_NEW) break;
    await sleep(PAGE_DELAY);
  }

  await mongo.close();

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Sync complete`);
  console.log(`   Scanned    : ${scanned} listings`);
  console.log(`   NEW added  : ${added}`);
  console.log(`   Failed     : ${failed}`);
  console.log(`   DB total   : ${seen.size}${DRY_RUN ? " (dry-run, not persisted)" : ""}`);
  if (!DRY_RUN) console.log(`\n   Live now via /api/gifs (MongoDB + Firebase Storage).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
