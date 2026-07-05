import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/admin-auth";
import { Document, WithId } from "mongodb";

function serialize(doc: WithId<Document>) {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const docs = await db
    .collection("gifs")
    .find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();

  return NextResponse.json(docs.map(serialize));
}
