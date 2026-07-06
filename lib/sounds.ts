import { readFile } from "fs/promises";
import path from "path";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { baseSlugFor, uniqueSlug } from "@/lib/slug";

export interface SoundDoc {
  id: string;
  slug: string;
  name: string;
  category: string;
  dur?: string;
  filename?: string;
  firebaseUrl?: string;
  url?: string;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  plays?: number;
  createdAt?: string | Date;
}

const VISIBLE_FILTER = { status: { $nin: ["pending", "hidden"] } };

function serialize(doc: WithId<Document>): SoundDoc {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() } as SoundDoc;
}

async function readLocalSounds(): Promise<SoundDoc[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "sounds.json"), "utf8");
    const parsed = JSON.parse(raw) as Array<Omit<SoundDoc, "slug"> & { slug?: string }>;
    // Local fallback ids are already slug-shaped (e.g. "vine-boom") — reuse them.
    return parsed.map((s) => ({ ...s, slug: s.slug ?? s.id }));
  } catch {
    return [];
  }
}

export async function getSoundById(id: string): Promise<SoundDoc | null> {
  const db = await getDb();
  if (db) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return null;
    }
    const doc = await db.collection("sounds").findOne({ _id: oid, ...VISIBLE_FILTER });
    return doc ? serialize(doc) : null;
  }

  const sounds = await readLocalSounds();
  return sounds.find((s) => s.id === id) ?? null;
}

export async function getSoundBySlug(slug: string): Promise<SoundDoc | null> {
  const db = await getDb();
  if (db) {
    const doc = await db.collection("sounds").findOne({ slug, ...VISIBLE_FILTER });
    return doc ? serialize(doc) : null;
  }

  const sounds = await readLocalSounds();
  return sounds.find((s) => s.slug === slug) ?? null;
}

/** Generates a unique slug for a brand-new sound doc (used by the admin upload API). */
export async function generateUniqueSoundSlug(name: string, filename?: string): Promise<string> {
  const base = baseSlugFor(name, filename);
  const db = await getDb();
  if (!db) return base;
  const existing = await db.collection("sounds").find({}, { projection: { slug: 1 } }).toArray();
  const taken = new Set(existing.map((d) => d.slug as string).filter(Boolean));
  return uniqueSlug(base, taken);
}

export async function getSoundCategoryCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  if (db) {
    const agg = await db.collection("sounds")
      .aggregate([
        { $match: VISIBLE_FILTER },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray();
    return Object.fromEntries(agg.map((a) => [a._id as string, a.count as number]));
  }

  const sounds = await readLocalSounds();
  const counts: Record<string, number> = {};
  for (const s of sounds) counts[s.category] = (counts[s.category] ?? 0) + 1;
  return counts;
}

export async function getSoundsByCategory(category: string, limit = 300): Promise<{ sounds: SoundDoc[]; total: number }> {
  const db = await getDb();
  if (db) {
    const filter = { category, ...VISIBLE_FILTER };
    const [total, docs] = await Promise.all([
      db.collection("sounds").countDocuments(filter),
      db.collection("sounds").find(filter).sort({ plays: -1, likes: -1, createdAt: -1 }).limit(limit).toArray(),
    ]);
    return { sounds: docs.map(serialize), total };
  }

  const sounds = await readLocalSounds();
  const matching = sounds.filter((s) => s.category === category);
  return { sounds: matching.slice(0, limit), total: matching.length };
}

export async function getSimilarSounds(sound: SoundDoc, limit = 8): Promise<SoundDoc[]> {
  const db = await getDb();
  if (db) {
    const filter: Record<string, unknown> = { category: sound.category, ...VISIBLE_FILTER };
    try {
      filter._id = { $ne: new ObjectId(sound.id) };
    } catch {
      // not a valid ObjectId — leave filter as-is
    }
    const docs = await db.collection("sounds")
      .find(filter)
      .sort({ likes: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(serialize);
  }

  const sounds = await readLocalSounds();
  return sounds
    .filter((s) => s.category === sound.category && s.id !== sound.id)
    .slice(0, limit);
}

export async function getAllSoundSlugsForSitemap(): Promise<{ slug: string; updatedAt?: Date }[]> {
  const db = await getDb();
  if (db) {
    const docs = await db.collection("sounds")
      .find({ ...VISIBLE_FILTER, slug: { $exists: true } }, { projection: { slug: 1, createdAt: 1 } })
      .toArray();
    return docs.map((d) => ({ slug: d.slug as string, updatedAt: d.createdAt }));
  }

  const sounds = await readLocalSounds();
  return sounds.map((s) => ({
    slug: s.slug,
    updatedAt: s.createdAt ? new Date(s.createdAt) : undefined,
  }));
}
