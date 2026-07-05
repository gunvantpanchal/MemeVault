#!/usr/bin/env node
/**
 * GifVault Sync  (Giphy API → Firebase Storage → MongoDB)
 *
 * Pulls meme GIFs from the official Giphy API, skips anything already in the
 * live MongoDB, and for every NEW gif streams the file straight to Firebase
 * Storage and inserts the metadata doc. Nothing is written to data/gifs.json —
 * the live app reads from MongoDB. Safe to re-run: dedupe is by `giphyId`
 * against MongoDB (unique index).
 *
 * Requires a free Giphy API key: https://developers.giphy.com/dashboard/
 * Set GIPHY_API_KEY in .env.local before running.
 *
 * Prereqs (same as npm run sync):
 *   - serviceAccount.json in project root (Firebase Admin key)
 *   - .env.local with NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET + MONGODB_URI + GIPHY_API_KEY
 *
 * Usage:
 *   node scripts/sync-gifs.mjs                  # add up to 1000 new gifs
 *   node scripts/sync-gifs.mjs --max 200        # cap new gifs
 *   node scripts/sync-gifs.mjs --rating pg      # stricter content rating
 *   node scripts/sync-gifs.mjs --dry-run        # discover only, no upload
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API_BASE = "https://api.giphy.com/v1/gifs";
const PAGE_DELAY = 700; // ms between API calls
const DL_DELAY = 150; // ms between downloads
const PAGE_SIZE = 50; // Giphy max per request
const MAX_FILE_BYTES = 8 * 1024 * 1024; // fall back to a smaller rendition above this
const FETCH_TIMEOUT = 20000;

// Search terms pulling from Giphy's "memes" category → all tagged Memes here.
// (Trending/other categories are handled by scripts/scrape-gifs.mjs for local mode.)
const TERMS = ["memes", "meme", "funny meme", "dank meme", "relatable meme"];

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const maxIdx = args.indexOf("--max");
const MAX_NEW = maxIdx !== -1 ? parseInt(args[maxIdx + 1]) || 1000 : 1000;
const ratingIdx = args.indexOf("--rating");
const RATING = ratingIdx !== -1 ? args[ratingIdx + 1] : "pg-13";

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

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function slugToTitle(slug, fallback) {
  if (!slug) return fallback;
  const words = slug.split("-").slice(0, -1);
  const title = words.join(" ").trim();
  return title || fallback;
}

async function downloadBuffer(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await loadEnv();
  console.log("🎞️  GifVault Sync (Giphy → Firebase Storage → MongoDB)\n");
  console.log(`   Target: up to ${MAX_NEW} NEW gifs${DRY_RUN ? "  [DRY RUN]" : ""} (rating: ${RATING})\n`);

  const apiKey = process.env.GIPHY_API_KEY;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const mongoUri = process.env.MONGODB_URI;
  if (!apiKey) { console.error("❌ GIPHY_API_KEY not set — get one free at https://developers.giphy.com/dashboard/"); process.exit(1); }
  if (!bucketName) { console.error("❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set"); process.exit(1); }
  if (!mongoUri) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

  // ── MongoDB ──
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const col = mongo.db("memevault").collection("gifs");
  await col.createIndex({ giphyId: 1 }, { unique: true, sparse: true }).catch(() => {});

  const existing = await col.find({}, { projection: { giphyId: 1 } }).toArray();
  const seen = new Set(existing.map((d) => d.giphyId).filter(Boolean));
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

  for (const term of TERMS) {
    if (added >= MAX_NEW) break;

    let offset = 0;
    let total = Infinity;
    let emptyStreak = 0;

    while (offset < total && added < MAX_NEW) {
      const params = new URLSearchParams({
        api_key: apiKey, q: term, limit: String(PAGE_SIZE),
        offset: String(offset), rating: RATING, lang: "en",
      });

      let json;
      try {
        json = await fetchJson(`${API_BASE}/search?${params.toString()}`);
      } catch (e) {
        process.stderr.write(`   ✗ "${term}" offset ${offset}: ${e.message}\n`);
        await sleep(PAGE_DELAY * 2);
        break;
      }

      const items = json.data ?? [];
      total = json.pagination?.total_count ?? items.length;
      if (items.length === 0) break;
      scanned += items.length;

      const fresh = items.filter((it) => !seen.has(it.id));
      console.log(`📄 "${term}" offset ${offset} — ${fresh.length}/${items.length} new`);

      if (fresh.length === 0) {
        if (++emptyStreak >= 3) break; // several stale pages in a row — move to next term
      } else {
        emptyStreak = 0;
      }

      for (const item of fresh) {
        if (added >= MAX_NEW) break;
        seen.add(item.id); // reserve so other terms skip it

        if (DRY_RUN) { console.log(`   + ${item.slug || item.id}`); added++; continue; }

        const images = item.images ?? {};
        const original = images.original;
        const fallback = images.downsized_medium ?? images.fixed_height;
        const useOriginal = original?.url && (!original.size || parseInt(original.size) <= MAX_FILE_BYTES);
        const chosen = useOriginal ? original : (fallback ?? original);
        if (!chosen?.url) { failed++; continue; }

        const name = slugToTitle(item.slug, item.title || "Meme GIF");
        const storagePath = `gifs/${item.id}.gif`;

        try {
          const buf = await downloadBuffer(chosen.url);
          const file = bucket.file(storagePath);
          await file.save(buf, { metadata: { contentType: "image/gif" }, public: true, resumable: false });
          const firebaseUrl = file.publicUrl();

          await col.insertOne({
            giphyId:    item.id,
            name,
            category:   "Memes",
            filename:   `${item.id}.gif`,
            firebaseUrl,
            storagePath,
            width:      parseInt(chosen.width) || undefined,
            height:     parseInt(chosen.height) || undefined,
            source:     "giphy",
            sourceUrl:  item.url,
            likes: 0, dislikes: 0, downloads: 0, views: 0,
            createdAt: new Date(),
          });
          added++;
          if (added % 25 === 0) console.log(`   … ${added} added so far`);
        } catch (e) {
          if (e.code === 11000) { /* duplicate — already inserted */ }
          else { failed++; process.stderr.write(`   ✗ ${item.id}: ${e.message}\n`); }
        }
        await sleep(DL_DELAY);
      }

      offset += PAGE_SIZE;
      await sleep(PAGE_DELAY);
    }
  }

  await mongo.close();

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Sync complete`);
  console.log(`   Scanned    : ${scanned} listings`);
  console.log(`   NEW added  : ${added}`);
  console.log(`   Failed     : ${failed}`);
  console.log(`   DB total   : ${seen.size}${DRY_RUN ? " (dry-run, not persisted)" : ""}`);
  if (!DRY_RUN) console.log(`\n   Live now via /api/gifs (MongoDB + Firebase Storage).`);
  console.log(`\n⚠  Remember: Giphy's API terms require a "Powered By GIPHY" credit`);
  console.log(`   wherever this content is shown — see developers.giphy.com/docs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
