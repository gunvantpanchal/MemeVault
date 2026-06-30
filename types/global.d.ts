export {};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }

  // Reuse MongoDB connection across Next.js hot-reloads in dev
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<import("mongodb").MongoClient> | undefined;
}
