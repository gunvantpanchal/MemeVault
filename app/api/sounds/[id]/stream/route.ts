import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET /api/sounds/[id]/stream
// Server-side proxy for audio playback — no CORS issues, no Content-Disposition.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  let firebaseUrl: string | null = null;

  if (db) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const doc = await db.collection("sounds").findOne(
      { _id: oid },
      { projection: { firebaseUrl: 1, url: 1 } }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    firebaseUrl = (doc.firebaseUrl || doc.url) as string | null;
  }

  if (!firebaseUrl) {
    return NextResponse.json({ error: "File URL not found" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(firebaseUrl);
    if (!upstream.ok) throw new Error(`Firebase ${upstream.status}`);
  } catch (e) {
    return NextResponse.json(
      { error: `Stream failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
