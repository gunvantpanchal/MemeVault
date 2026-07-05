import { readFile } from "fs/promises";
import path from "path";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export interface GifDoc {
  id: string;
  name: string;
  category: string;
  filename?: string;
  firebaseUrl?: string;
  url?: string;
  width?: number;
  height?: number;
  likes?: number;
  dislikes?: number;
  downloads?: number;
  views?: number;
  createdAt?: string | Date;
}

const VISIBLE_FILTER = { status: { $nin: ["pending", "hidden"] } };

function serialize(doc: WithId<Document>): GifDoc {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() } as GifDoc;
}

async function readLocalGifs(): Promise<GifDoc[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "gifs.json"), "utf8");
    return JSON.parse(raw) as GifDoc[];
  } catch {
    return [];
  }
}

export async function getGifById(id: string): Promise<GifDoc | null> {
  const db = await getDb();
  if (db) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return null;
    }
    const doc = await db.collection("gifs").findOne({ _id: oid, ...VISIBLE_FILTER });
    return doc ? serialize(doc) : null;
  }

  const gifs = await readLocalGifs();
  return gifs.find((g) => g.id === id) ?? null;
}

export async function getSimilarGifs(gif: GifDoc, limit = 8): Promise<GifDoc[]> {
  const db = await getDb();
  if (db) {
    const filter: Record<string, unknown> = { category: gif.category, ...VISIBLE_FILTER };
    try {
      filter._id = { $ne: new ObjectId(gif.id) };
    } catch {
      // not a valid ObjectId — leave filter as-is
    }
    const docs = await db.collection("gifs")
      .find(filter)
      .sort({ likes: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(serialize);
  }

  const gifs = await readLocalGifs();
  return gifs
    .filter((g) => g.category === gif.category && g.id !== gif.id)
    .slice(0, limit);
}

export async function getGifCategoryCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  if (db) {
    const agg = await db.collection("gifs")
      .aggregate([
        { $match: VISIBLE_FILTER },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray();
    return Object.fromEntries(agg.map((a) => [a._id as string, a.count as number]));
  }

  const gifs = await readLocalGifs();
  const counts: Record<string, number> = {};
  for (const g of gifs) counts[g.category] = (counts[g.category] ?? 0) + 1;
  return counts;
}

export async function getAllGifIdsForSitemap(): Promise<{ id: string; updatedAt?: Date }[]> {
  const db = await getDb();
  if (db) {
    const docs = await db.collection("gifs")
      .find(VISIBLE_FILTER, { projection: { _id: 1, createdAt: 1 } })
      .toArray();
    return docs.map((d) => ({ id: d._id.toString(), updatedAt: d.createdAt }));
  }

  const gifs = await readLocalGifs();
  return gifs.map((g) => ({
    id: g.id,
    updatedAt: g.createdAt ? new Date(g.createdAt) : undefined,
  }));
}
