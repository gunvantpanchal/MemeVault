import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

export const isMongoConfigured = Boolean(uri);

let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    // Reuse connection across hot-reloads in dev
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }
}

export default clientPromise;

export async function getDb(): Promise<Db | null> {
  if (!clientPromise) return null;
  const client = await clientPromise;
  return client.db("memevault");
}
