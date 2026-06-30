import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: true });

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: true }); // non-fatal for local-mode IDs
  }

  await db.collection("sounds").updateOne(
    { _id: oid },
    { $inc: { downloads: 1 } },
  );

  return NextResponse.json({ ok: true });
}
