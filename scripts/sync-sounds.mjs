#!/usr/bin/env node
/**
 * MemeVault Sound Sync  (scrape → dedupe → Firebase Storage → MongoDB)
 *
 * Scrapes myinstants.com deeply (India index + search pagination across many
 * terms), skips anything already in the live MongoDB, and for every NEW sound
 * streams the MP3 straight to Firebase Storage and inserts the metadata doc.
 *
 * Nothing is written to data/sounds.json — the live app reads from MongoDB.
 * Safe to re-run: dedupe is by `filename` against MongoDB (unique index).
 *
 * Prereqs (same as npm run upload):
 *   - serviceAccount.json in project root (Firebase Admin key)
 *   - .env.local with NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET + MONGODB_URI
 *
 * Usage:
 *   node scripts/sync-sounds.mjs                 # add up to 3000 new sounds
 *   node scripts/sync-sounds.mjs --max 500       # cap new sounds
 *   node scripts/sync-sounds.mjs --dry-run       # discover only, no upload
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BASE_URL = "https://www.myinstants.com";
const PAGE_DELAY = 650; // ms between page fetches
const DL_DELAY = 120; // ms between MP3 downloads
const PAGE_CAP = 60; // max search pages per term
const FETCH_TIMEOUT = 20000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Search terms → default category. Ordered by priority (Indian/meme first).
const SOURCES = [
  ["india", "Trending"], ["indian", "Trending"], ["desi", "Bollywood"],
  ["bollywood", "Bollywood"], ["hindi", "Bollywood"], ["punjabi", "Bollywood"],
  ["tamil", "Bollywood"], ["telugu", "Bollywood"], ["cricket", "Trending"],
  ["meme", "Memes"], ["funny", "Memes"], ["comedy", "Memes"], ["vine", "Memes"],
  ["dank", "Memes"], ["cartoon", "Memes"], ["spongebob", "Memes"],
  ["anime", "Anime"], ["naruto", "Anime"], ["goku", "Anime"], ["one piece", "Anime"],
  ["gaming", "Gaming"], ["minecraft", "Gaming"], ["roblox", "Gaming"],
  ["among us", "Gaming"], ["pubg", "Gaming"], ["free fire", "Gaming"], ["gta", "Gaming"],
  ["viral", "Viral"], ["tiktok", "Viral"], ["reel", "Viral"], ["instagram", "Viral"],
  ["phonk", "Viral"], ["sigma", "Viral"], ["skibidi", "Viral"], ["rizz", "Viral"],
  ["reaction", "Reactions"], ["scream", "Reactions"], ["laugh", "Reactions"],
  ["crying", "Reactions"], ["bruh", "Reactions"], ["oh no", "Reactions"],
  ["sound effect", "FX"], ["fart", "FX"], ["bonk", "FX"], ["boom", "FX"],
  ["airhorn", "FX"], ["explosion", "FX"],
  ["alarm", "Alerts"], ["notification", "Alerts"], ["bell", "Alerts"], ["alert", "Alerts"],
  ["song", "Music"], ["music", "Music"], ["beat", "Music"], ["remix", "Music"],
  ["movie", "Memes"], ["dialogue", "Bollywood"], ["whatsapp", "Trending"],
];

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const maxIdx = args.indexOf("--max");
const MAX_NEW = maxIdx !== -1 ? parseInt(args[maxIdx + 1]) || 3000 : 3000;

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

function detectCategory(name, defaultCat) {
  const n = name.toLowerCase();
  if (/\b(anime|naruto|goku|pokemon|pikachu|sasuke|demon slayer|jujutsu|jjk|bleach|one piece|luffy)\b/.test(n)) return "Anime";
  if (/\b(bollywood|hindi|desi|filmy|shahrukh|salman|amitabh|bahubali|singham|punjabi)\b/.test(n)) return "Bollywood";
  if (/\b(minecraft|roblox|among us|pubg|valorant|fortnite|gta|free fire|gaming)\b/.test(n)) return "Gaming";
  if (/\b(tiktok|viral|reel|instagram|phonk|sigma|skibidi|rizz)\b/.test(n)) return "Viral";
  return defaultCat;
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

function parseSounds(html, defaultCat) {
  const out = [];
  const seen = new Set();
  const re = /onclick="share\('([^']+)',\s*'[^']+',\s*'(\/media\/sounds\/[^']+\.mp3)'/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    const soundPath = m[2];
    const filename = path.basename(soundPath);
    if (!name || name.length > 120) continue;
    if (seen.has(filename)) continue;
    seen.add(filename);
    out.push({ name, soundPath, filename, category: detectCategory(name, defaultCat) });
  }
  return out;
}

async function fetchHtml(url) {
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function downloadMp3(soundPath) {
  const res = await fetchWithTimeout(`${BASE_URL}${soundPath}`, {
    headers: { ...HEADERS, Referer: BASE_URL },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!/audio|octet-stream|mpeg/i.test(type)) throw new Error(`bad type ${type}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await loadEnv();
  console.log("🎭 MemeVault Sound Sync\n");
  console.log(`   Target: up to ${MAX_NEW} NEW sounds${DRY_RUN ? "  [DRY RUN]" : ""}\n`);

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const mongoUri = process.env.MONGODB_URI;
  if (!bucketName) { console.error("❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set"); process.exit(1); }
  if (!mongoUri) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

  // ── MongoDB ──
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const col = mongo.db("memevault").collection("sounds");
  await col.createIndex({ filename: 1 }, { unique: true }).catch(() => {});

  const existing = await col.find({}, { projection: { filename: 1 } }).toArray();
  const seen = new Set(existing.map((d) => d.filename));
  console.log(`   Live DB has ${seen.size} sounds — these will be skipped.\n`);

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
  const sources = [
    { url: `${BASE_URL}/en/index/in/`, category: "Trending", label: "India index" },
    ...SOURCES.map(([term, category]) => ({ term, category, label: `search:${term}` })),
  ];

  for (const src of sources) {
    if (added >= MAX_NEW) break;

    const maxPages = src.url ? 1 : PAGE_CAP;
    let emptyStreak = 0;

    for (let page = 1; page <= maxPages && added < MAX_NEW; page++) {
      const url = src.url
        ? src.url
        : `${BASE_URL}/en/search/?name=${encodeURIComponent(src.term)}&page=${page}`;

      let sounds;
      try {
        sounds = parseSounds(await fetchHtml(url), src.category);
      } catch (e) {
        process.stderr.write(`   ✗ ${src.label} p${page}: ${e.message}\n`);
        await sleep(PAGE_DELAY);
        continue;
      }

      if (sounds.length === 0) break; // end of this term's results
      scanned += sounds.length;

      const fresh = sounds.filter((s) => !seen.has(s.filename));
      if (fresh.length === 0) {
        // whole page already known — after 3 such pages, move on
        if (++emptyStreak >= 3) break;
        await sleep(PAGE_DELAY);
        continue;
      }
      emptyStreak = 0;

      console.log(`📄 ${src.label} p${page} — ${fresh.length} new`);

      for (const s of fresh) {
        if (added >= MAX_NEW) break;
        seen.add(s.filename); // reserve so other terms skip it

        if (DRY_RUN) { console.log(`   + ${s.name}`); added++; continue; }

        const storagePath = `sounds/${s.filename}`;
        try {
          const buf = await downloadMp3(s.soundPath);
          const file = bucket.file(storagePath);
          await file.save(buf, { metadata: { contentType: "audio/mpeg" }, public: true, resumable: false });
          const firebaseUrl = file.publicUrl();

          await col.insertOne({
            name: s.name,
            category: s.category,
            filename: s.filename,
            firebaseUrl,
            storagePath,
            dur: "",
            plays: 0,
            downloads: 0,
            likes: 0,
            dislikes: 0,
            createdAt: new Date(),
          });
          added++;
          if (added % 25 === 0) console.log(`   … ${added} added so far`);
        } catch (e) {
          if (e.code === 11000) { /* duplicate — already inserted */ }
          else { failed++; process.stderr.write(`   ✗ ${s.filename}: ${e.message}\n`); }
        }
        await sleep(DL_DELAY);
      }

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
  if (!DRY_RUN) console.log(`\n   Live now via /api/sounds (MongoDB + Firebase Storage).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
