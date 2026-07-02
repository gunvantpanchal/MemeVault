import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/admin-auth";

// Marks all sounds that have no `status` field as "approved"
export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const result = await db.collection("sounds").updateMany(
    { status: { $exists: false } },
    { $set: { status: "approved" } },
  );

  return NextResponse.json({ updated: result.modifiedCount });
}
