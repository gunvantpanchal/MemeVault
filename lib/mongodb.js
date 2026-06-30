import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

export const isMongoConfigured = Boolean(uri);

let clientPromise = null;

if (uri) {
  let client;
  if (process.env.NODE_ENV === "development") {
    // Reuse connection across hot-reloads in dev
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export default clientPromise;

/** Returns the "memevault" db, or null if MongoDB isn't configured. */
export async function getDb() {
  if (!clientPromise) return null;
  const client = await clientPromise;
  return client.db("memevault");
}
