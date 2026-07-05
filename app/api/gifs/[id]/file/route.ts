import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  let fileUrl: string | null = null;
  let filename = `gif_${id}.gif`;

  if (db) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const doc = await db.collection("gifs").findOne({ _id: oid });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    fileUrl = (doc.firebaseUrl || doc.url) as string | null;
    filename =
      (doc.filename as string) ||
      `${((doc.name as string) ?? "gif").replace(/[^a-z0-9]/gi, "_")}.gif`;

    // Increment download count while we're here
    db.collection("gifs").updateOne({ _id: oid }, { $inc: { downloads: 1 } }).catch(() => {});
  }

  if (!fileUrl) {
    return NextResponse.json({ error: "File URL not found" }, { status: 404 });
  }

  // Fetch server-side (no CORS restriction, works for Firebase Storage or Giphy CDN)
  let upstream: Response;
  try {
    upstream = await fetch(fileUrl);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch file: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/gif",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": upstream.headers.get("Content-Length") ?? "",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
