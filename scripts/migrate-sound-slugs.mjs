#!/usr/bin/env node
/**
 * Backfills a unique, human-readable `slug` field onto every doc in the
 * `sounds` collection (e.g. "vine-boom", "maa-tari-oo-bhai") so /sound/[slug]
 * pages can use readable URLs instead of raw ObjectIds.
 *
 * Slug source priority per doc:
 *   1. `filename` (minus extension) if it's already a clean kebab-case string
 *      (true for most myinstants-scraped sounds)
 *   2. otherwise slugify(name) (used for admin uploads / messy scraped filenames)
 * Collisions get a numeric suffix (-2, -3, ...).
 *
 * Safe to re-run: only docs missing `slug` are touched.
 *
 * Usage:
 *   node scripts/migrate-sound-slugs.mjs --dry-run   # preview only, no writes
 *   node scripts/migrate-sound-slugs.mjs             # write for real + create unique index
 */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DRY_RUN = process.argv.includes("--dry-run");

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const eq = line.indexOf("=");
      if (eq === -1 || line.startsWith("#")) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // no .env.local — rely on already-exported env vars
  }
}

function slugify(input) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "sound"
  );
}

const CLEAN_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIMESTAMP_PREFIX_RE = /^\d{10,}-/;

function baseSlugFor(name, filename) {
  if (filename) {
    const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
    if (CLEAN_SLUG_RE.test(stem) && !TIMESTAMP_PREFIX_RE.test(stem)) {
      return stem;
    }
  }
  return slugify(name || "sound");
}

function uniqueSlug(base, taken) {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  taken.add(candidate);
  return candidate;
}

async function main() {
  await loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set — nothing to migrate.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("memevault");
  const col = db.collection("sounds");

  const existingSlugs = await col.find({ slug: { $exists: true } }, { projection: { slug: 1 } }).toArray();
  const taken = new Set(existingSlugs.map((d) => d.slug));
  console.log(`Docs already slugged: ${taken.size}`);

  const cursor = col.find(
    { slug: { $exists: false } },
    { projection: { name: 1, filename: 1 }, sort: { createdAt: 1 } },
  );

  const updates = [];
  let count = 0;
  const samples = [];

  for await (const doc of cursor) {
    const base = baseSlugFor(doc.name, doc.filename);
    const slug = uniqueSlug(base, taken);
    updates.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { slug } } } });
    if (samples.length < 15) samples.push({ name: doc.name, filename: doc.filename, slug });
    count++;
  }

  console.log(`Docs needing a slug: ${count}`);
  console.log("\nSample mappings:");
  for (const s of samples) console.log(`  "${s.name}" (${s.filename ?? "no filename"}) -> ${s.slug}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: no writes performed, no index created.");
    await client.close();
    return;
  }

  const BATCH = 500;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await col.bulkWrite(batch, { ordered: false });
    console.log(`  wrote ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }

  await col.createIndex({ slug: 1 }, { unique: true });
  console.log("\nUnique index on `slug` created (or already existed).");

  const remaining = await col.countDocuments({ slug: { $exists: false } });
  console.log(`Docs still missing a slug: ${remaining}`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
