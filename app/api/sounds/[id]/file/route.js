import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET /api/sounds/[id]/file
// Proxies the audio file from Firebase Storage server-side (no CORS issue)
// and returns it with Content-Disposition: attachment so the browser saves it.
export async function GET(_, { params }) {
  const { id } = await params;
  const db = await getDb();

  let firebaseUrl = null;
  let filename    = `sound_${id}.mp3`;

  if (db) {
    let oid;
    try { oid = new ObjectId(id); } catch { /* invalid id */ }

    if (oid) {
      const doc = await db.collection("sounds").findOne({ _id: oid });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      firebaseUrl = doc.firebaseUrl || doc.url;
      filename    = doc.filename || `${doc.name?.replace(/[^a-z0-9]/gi, "_") || "sound"}.mp3`;

      // Increment download count while we're here
      db.collection("sounds").updateOne({ _id: oid }, { $inc: { downloads: 1 } }).catch(() => {});
    }
  }

  if (!firebaseUrl) {
    return NextResponse.json({ error: "File URL not found" }, { status: 404 });
  }

  // Fetch the file from Firebase Storage server-side (no CORS restriction)
  let upstream;
  try {
    upstream = await fetch(firebaseUrl);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch file: ${e.message}` }, { status: 502 });
  }

  // Stream back to the browser with attachment disposition → triggers save dialog
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": upstream.headers.get("Content-Length") || "",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
