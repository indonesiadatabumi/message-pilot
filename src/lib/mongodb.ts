// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
if (!dbName) {
  throw new Error('Please define the MONGODB_DB environment variable inside .env.local');
}

// Extend the NodeJS global type to include the MongoDB client promise
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient>;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
    console.log("Establishing new MongoDB connection (development).");
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
   console.log("Establishing new MongoDB connection (production).");
}

/**
 * Gets the MongoDB database instance.
 * Reuses the connection pool across requests.
 *
 * @returns {Promise<Db>} A promise that resolves to the MongoDB database instance.
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
