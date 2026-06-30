import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const config = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase Storage is used for audio files.
// Metadata (likes, dislikes, downloads, etc.) is stored in MongoDB, not Firestore.
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.storageBucket
);

let storage = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(config);
  storage = getStorage(app);
}

export { storage };
