import { userStore } from './userStore';
import { decryptSecret } from './crypto';

export async function resolveGithubToken(userId: string): Promise<string | null> {
  const enc = await userStore.getEncryptedGithubToken(userId);
  if (!enc || enc === 'mock') return null;
  try {
    return decryptSecret(enc);
  } catch {
    return null;
  }
}