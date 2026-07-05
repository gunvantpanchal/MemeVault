import { NextResponse } from "next/server";
import { getGifCategoryCounts } from "@/lib/gifs";

export async function GET() {
  const counts = await getGifCategoryCounts();
  return NextResponse.json({ counts });
}
