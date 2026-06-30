import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

function serialize(doc) {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

// GET /api/sounds?q=vine&cat=Memes
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q   = searchParams.get("q")?.trim();
  const cat = searchParams.get("cat");

  const db = await getDb();

  if (db) {
    const filter = {};
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

  // Local JSON fallback (populated by npm run scrape)
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "sounds.json"), "utf8");
    let data = JSON.parse(raw);
    if (q) data = data.filter((s) => s.name?.toLowerCase().includes(q.toLowerCase()));
    if (cat && cat !== "All") data = data.filter((s) => s.category === cat);
    return NextResponse.json(data, { headers: { "X-Sound-Source": "local" } });
  } catch {
    return NextResponse.json([], { headers: { "X-Sound-Source": "none" } });
  }
}

// POST /api/sounds  — called by the upload form after Firebase Storage upload
export async function POST(request) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "MongoDB not configured — add MONGODB_URI to .env.local" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { name, category, filename, firebaseUrl, dur } = body;

  if (!name?.trim() || !firebaseUrl) {
    return NextResponse.json({ error: "name and firebaseUrl are required" }, { status: 400 });
  }

  // Prevent duplicate filenames
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
