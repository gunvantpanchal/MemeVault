#!/usr/bin/env node
/**
 * MemeVault → Firebase Storage + MongoDB uploader
 *
 * Reads data/sounds.json (written by npm run scrape), uploads each MP3 from
 * public/sounds/ to Firebase Storage, then saves metadata to MongoDB.
 *
 * Prerequisites:
 *   1. npm install firebase-admin
 *   2. Firebase Console → Project Settings → Service Accounts →
 *      Generate new private key → save as serviceAccount.json (project root)
 *      OR set GOOGLE_APPLICATION_CREDENTIALS env var
 *   3. Copy .env.local.example → .env.local and fill in:
 *        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
 *        MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/memevault
 *
 * Usage:
 *   npm run upload                  # upload everything
 *   npm run upload -- --limit 50   # first 50 only
 *   npm run upload -- --dry-run    # preview without uploading
 */

import { readFile, stat } from "fs/promises";
import { existsSync }     from "fs";
import path               from "path";
import { fileURLToPath }  from "url";
import { MongoClient }    from "mongodb";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, "..");
const SOUNDS_DIR = path.join(ROOT, "public", "sounds");
const DATA_FILE  = path.join(ROOT, "data", "sounds.json");

// ── CLI args ───────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limIdx  = args.indexOf("--limit");
const LIMIT   = limIdx !== -1 ? (parseInt(args[limIdx + 1]) || Infinity) : Infinity;

// ── Load .env.local ────────────────────────────────────────────────────────
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

async function main() {
  await loadEnv();
  console.log("☁  MemeVault → Firebase Storage + MongoDB\n");

  // ── Validate env ───────────────────────────────────────────────────────
  const bucket     = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const mongoUri   = process.env.MONGODB_URI;

  if (!bucket) {
    console.error("❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set in .env.local"); process.exit(1);
  }
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not set in .env.local\n   Get it from MongoDB Atlas → Connect → Drivers"); process.exit(1);
  }

  // ── Load sounds list ───────────────────────────────────────────────────
  let sounds;
  try { sounds = JSON.parse(await readFile(DATA_FILE, "utf8")); }
  catch { console.error("❌ data/sounds.json not found — run  npm run scrape  first"); process.exit(1); }

  const toUpload = sounds
    .filter((s) => existsSync(path.join(SOUNDS_DIR, s.filename)))
    .slice(0, LIMIT);

  console.log(`   ${sounds.length} sounds in JSON, ${toUpload.length} have local MP3 files\n`);

  if (DRY_RUN) {
    console.log("   [dry-run] would upload:");
    toUpload.forEach((s) => console.log(`   · ${s.filename}  →  ${s.name}`));
    return;
  }

  // ── Init Firebase Admin ────────────────────────────────────────────────
  let admin;
  try { admin = (await import("firebase-admin")).default; }
  catch {
    console.error("❌ firebase-admin not installed.\n   Run:  npm install firebase-admin  then retry.");
    process.exit(1);
  }

  let credential;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    const saPath = path.join(ROOT, "serviceAccount.json");
    if (!existsSync(saPath)) {
      console.error(
        "❌ No service account found.\n" +
        "   Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccount.json in the project root.\n" +
        "   Firebase Console → Project Settings → Service Accounts → Generate new private key"
      );
      process.exit(1);
    }
    const sa = JSON.parse(await readFile(saPath, "utf8"));
    credential = admin.credential.cert(sa);
  }

  if (!admin.apps.length) admin.initializeApp({ credential, storageBucket: bucket });
  const storageBucket = admin.storage().bucket();

  // ── Init MongoDB ───────────────────────────────────────────────────────
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db("memevault");
  const col = db.collection("sounds");

  // Create indexes (idempotent)
  await col.createIndex({ filename: 1 }, { unique: true });
  await col.createIndex({ category: 1 });
  await col.createIndex({ createdAt: -1 });

  console.log("   Connected to MongoDB ✓\n");

  let uploaded = 0, skipped = 0, failed = 0;

  for (const s of toUpload) {
    const localPath = path.join(SOUNDS_DIR, s.filename);
    const storagePath = `sounds/${s.filename}`;

    process.stdout.write(`   ↑ ${s.name.slice(0, 38).padEnd(38)} `);

    // Skip if already in MongoDB
    const exists = await col.findOne({ filename: s.filename });
    if (exists) { process.stdout.write("(skip — already in MongoDB)\n"); skipped++; continue; }

    try {
      // Upload to Firebase Storage
      const [file] = await storageBucket.upload(localPath, {
        destination: storagePath,
        metadata: { contentType: "audio/mpeg" },
        public: true,
      });
      const firebaseUrl = file.publicUrl();

      // Save to MongoDB
      await col.insertOne({
        name:       s.name,
        category:   s.category,
        filename:   s.filename,
        firebaseUrl,
        storagePath,
        dur:        s.dur || "",
        plays:      0,
        downloads:  0,
        likes:      0,
        dislikes:   0,
        createdAt:  new Date(),
      });

      uploaded++;
      process.stdout.write("✓\n");
    } catch (e) {
      failed++;
      process.stdout.write(`✗ ${e.message}\n`);
    }
  }

  await mongo.close();

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done`);
  console.log(`   Uploaded : ${uploaded}`);
  console.log(`   Skipped  : ${skipped}  (already in MongoDB)`);
  console.log(`   Failed   : ${failed}`);
  console.log(`\n▶  npm run dev    →  loads live from MongoDB + Firebase Storage`);
  console.log(`   Sounds accessible via /api/sounds\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
