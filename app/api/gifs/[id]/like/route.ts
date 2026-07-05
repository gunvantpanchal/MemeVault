import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  if (!db) return NextResponse.json({ likes: 0, dislikes: 0 });

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const doc = await db.collection("gifs").findOneAndUpdate(
    { _id: oid },
    { $inc: { likes: 1 } },
    { returnDocument: "after" },
  );

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ likes: doc.likes, dislikes: doc.dislikes });
}
