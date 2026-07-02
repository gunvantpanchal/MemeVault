import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };
type Status = "approved" | "hidden" | "pending";

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: Status };

  if (!body.status || !["approved", "hidden", "pending"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.collection("sounds").updateOne({ _id: oid }, { $set: { status: body.status } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!await isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.collection("sounds").deleteOne({ _id: oid });
  return NextResponse.json({ ok: true });
}
