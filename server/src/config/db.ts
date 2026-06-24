import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connected = false;

export async function connectDB(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  mongoose.connection.on('connected', () => console.log('[db] connected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  connected = true;
}

export function isDbConnected(): boolean {
  return connected;
}

export async function disconnectDB(): Promise<void> {
  if (connected) await mongoose.connection.close();
}
