import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Document, WithId } from "mongodb";

function serialize(doc: WithId<Document>) {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q   = searchParams.get("q")?.trim();
  const cat = searchParams.get("cat");

  const db = await getDb();

  if (db) {
    const filter: Record<string, unknown> = {};
    if (cat && cat !== "All") filter.category = cat;
    if (q) filter.name = { $regex: q, $options: "i" };

    const docs = await db
      .collection("sounds")
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray();

    return NextResponse.json(docs.map(serialize), {
      headers: { "X-Sound-Source": "mongodb" },
    });
  }

  // Local JSON fallback
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "sounds.json"), "utf8");
    let data = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (q) data = data.filter((s) => (s.name as string)?.toLowerCase().includes(q.toLowerCase()));
    if (cat && cat !== "All") data = data.filter((s) => s.category === cat);
    return NextResponse.json(data, { headers: { "X-Sound-Source": "local" } });
  } catch {
    return NextResponse.json([], { headers: { "X-Sound-Source": "none" } });
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
    dur?: string;
    storagePath?: string;
  };
  const { name, category, filename, firebaseUrl, dur } = body;

  if (!name?.trim() || !firebaseUrl) {
    return NextResponse.json({ error: "name and firebaseUrl are required" }, { status: 400 });
  }

  if (filename) {
    const exists = await db.collection("sounds").findOne({ filename });
    if (exists) {
      return NextResponse.json({ error: "A sound with this filename already exists" }, { status: 409 });
    }
  }

  const doc = {
    name:       name.trim(),
    category:   category || "Memes",
    filename:   filename || "",
    firebaseUrl,
    dur:        dur || "",
    plays:      0,
    downloads:  0,
    likes:      0,
    dislikes:   0,
    createdAt:  new Date(),
  };

  const result = await db.collection("sounds").insertOne(doc);
  return NextResponse.json({ id: result.insertedId.toString(), ...doc }, { status: 201 });
}
