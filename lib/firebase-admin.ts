import type { App } from "firebase-admin/app";

let adminApp: App | null = null;

export async function getAdminApp(): Promise<App> {
  if (adminApp) return adminApp;

  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");

  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp!;
  }

  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set");

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: set as JSON string or base64 in Vercel env vars
    let sa: object;
    try {
      sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString());
    }
    credential = cert(sa as Parameters<typeof cert>[0]);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  } else {
    // Dev fallback: serviceAccount.json in project root
    const path = await import("path");
    const fs   = await import("fs");
    const saPath = path.join(process.cwd(), "serviceAccount.json");
    if (!fs.existsSync(saPath)) {
      throw new Error(
        "No Firebase Admin credentials found.\n" +
        "• Dev: add serviceAccount.json to the project root\n" +
        "• Production: set FIREBASE_SERVICE_ACCOUNT env var in Vercel"
      );
    }
    const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
    credential = cert(sa);
  }

  adminApp = initializeApp({ credential, storageBucket: bucket });
  return adminApp;
}
