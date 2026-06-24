import { userStore } from './userStore';
import { decrypt } from './crypto';

export async function resolveGithubToken(userId: string): Promise<string | null> {
  const enc = await userStore.getEncryptedGithubToken(userId);
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}