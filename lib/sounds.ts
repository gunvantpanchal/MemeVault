import { readFile } from "fs/promises";
import path from "path";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export interface SoundDoc {
  id: string;
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
    return JSON.parse(raw) as SoundDoc[];
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

export async function getAllSoundIdsForSitemap(): Promise<{ id: string; updatedAt?: Date }[]> {
  const db = await getDb();
  if (db) {
    const docs = await db.collection("sounds")
      .find(VISIBLE_FILTER, { projection: { _id: 1, createdAt: 1 } })
      .toArray();
    return docs.map((d) => ({ id: d._id.toString(), updatedAt: d.createdAt }));
  }

  const sounds = await readLocalSounds();
  return sounds.map((s) => ({
    id: s.id,
    updatedAt: s.createdAt ? new Date(s.createdAt) : undefined,
  }));
}
