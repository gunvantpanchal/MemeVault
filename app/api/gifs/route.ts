import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Document, WithId } from "mongodb";

function serialize(doc: WithId<Document>) {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q")?.trim();
  const cat  = searchParams.get("cat");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const db = await getDb();

  if (db) {
    // Show approved gifs + legacy gifs that predate the status field
    const filter: Record<string, unknown> = { status: { $nin: ["pending", "hidden"] } };
    if (cat && cat !== "All") filter.category = cat;
    if (q) filter.name = { $regex: q, $options: "i" };

    const col = db.collection("gifs");
    const [total, docs] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).toArray(),
    ]);

    return NextResponse.json(
      { gifs: docs.map(serialize), total, page, limit, hasMore: skip + docs.length < total },
      { headers: { "X-Gif-Source": "mongodb" } },
    );
  }

  // Local JSON fallback
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "gifs.json"), "utf8");
    let data = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (q) data = data.filter((g) => (g.name as string)?.toLowerCase().includes(q.toLowerCase()));
    if (cat && cat !== "All") data = data.filter((g) => g.category === cat);
    const total = data.length;
    const paged = data.slice(skip, skip + limit);
    return NextResponse.json(
      { gifs: paged, total, page, limit, hasMore: skip + paged.length < total },
      { headers: { "X-Gif-Source": "local" } },
    );
  } catch {
    return NextResponse.json(
      { gifs: [], total: 0, page, limit, hasMore: false },
      { headers: { "X-Gif-Source": "none" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "MongoDB not configured — add MONGODB_URI to .env.local" },
      { status: 503 },
    );
  }

  const body = await request.json() as {
    name?: string;
    category?: string;
    filename?: string;
    firebaseUrl?: string;
    storagePath?: string;
    width?: number;
    height?: number;
  };
  const { name, category, filename, firebaseUrl, storagePath, width, height } = body;

  if (!name?.trim() || !firebaseUrl) {
    return NextResponse.json({ error: "name and firebaseUrl are required" }, { status: 400 });
  }

  // Use storagePath as filename when available — it already has a timestamp prefix
  // so it's always unique, even for repeated uploads of the same file.
  const resolvedFilename = storagePath
    ? storagePath.replace(/^gifs\//, "")
    : (filename || `${Date.now()}-gif.gif`);

  const doc = {
    name:       name.trim(),
    category:   category || "Memes",
    filename:   resolvedFilename,
    firebaseUrl,
    width:      width || undefined,
    height:     height || undefined,
    status:     "pending",   // requires admin approval before appearing in feed
    views:      0,
    downloads:  0,
    likes:      0,
    dislikes:   0,
    createdAt:  new Date(),
  };

  const result = await db.collection("gifs").insertOne(doc);
  return NextResponse.json({ id: result.insertedId.toString(), ...doc }, { status: 201 });
}
