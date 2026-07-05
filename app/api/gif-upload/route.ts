import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_PREFIXES = ["image/gif", "image/webp", "video/mp4", "video/webm"];

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const filename = (formData.get("filename") as string | null) ?? "gif.gif";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_PREFIXES.includes(file.type)) {
    return NextResponse.json({ error: "Only GIF, WebP, MP4, or WebM files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 413 });
  }

  try {
    const app = await getAdminApp();
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage(app).bucket();

    const buffer   = Buffer.from(await file.arrayBuffer());
    const filePath = `gifs/${Date.now()}-${filename}`;
    const fileRef  = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
      public: true,
    });

    // Public URL — same format the client SDK returns (no expiring token)
    const bucketName = bucket.name;
    const firebaseUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;

    return NextResponse.json({ firebaseUrl, storagePath: filePath });
  } catch (e) {
    const msg = (e as Error)?.message ?? "Upload failed";
    console.error("[/api/gif-upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
