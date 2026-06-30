import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(_, { params }) {
  const { id } = await params;
  const db = await getDb();
  if (!db) return NextResponse.json({ likes: 0, dislikes: 0 });

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const doc = await db.collection("sounds").findOneAndUpdate(
    { _id: oid },
    { $inc: { dislikes: 1 } },
    { returnDocument: "after" }
  );

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ likes: doc.likes, dislikes: doc.dislikes });
}
