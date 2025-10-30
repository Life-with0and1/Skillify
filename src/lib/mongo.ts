import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!client) {
    client = new MongoClient(uri);
  }
  await client.connect();
  if (!db) {
    // Prefer DB embedded in URI (respects exact case, e.g., 'Skillify').
    // If not provided in URI, fall back to explicit env, then a sensible default with proper case.
    const fallbackName = process.env.MONGODB_DB || 'Skillify';
    try {
      // client.db() with no args uses the db from the connection string if present
      const derived = client.db();
      // Some drivers still allow this even if no db in URI; ensure name falls back correctly
      const hasName = derived?.databaseName && typeof derived.databaseName === 'string';
      db = hasName ? derived : client.db(fallbackName);
    } catch {
      db = client.db(fallbackName);
    }
  }
  return db!;
}
