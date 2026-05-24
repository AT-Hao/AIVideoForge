import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_video';
const client = new MongoClient(uri);

let db;

export async function connectDB() {
  await client.connect();
  db = client.db();
  console.log('MongoDB connected:', uri);
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

export async function closeDB() {
  await client.close();
}
