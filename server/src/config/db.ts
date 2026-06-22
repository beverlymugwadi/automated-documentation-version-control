import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connected = false;

export async function connectDB(): Promise<boolean> {
  if (env.mockMode || !env.mongoUri) return false;

  mongoose.connection.on('connected', () => console.log('[db] connected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  connected = true;
  return true;
}

export function isDbConnected(): boolean {
  return connected;
}

export async function disconnectDB(): Promise<void> {
  if (connected) await mongoose.connection.close();
}
