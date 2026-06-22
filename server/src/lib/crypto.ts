import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32;

function getKey(): Buffer {
  if (env.encryptionKey) {
    return Buffer.from(env.encryptionKey.padEnd(KEY_LEN, '0').slice(0, KEY_LEN));
  }
  return crypto.randomBytes(KEY_LEN);
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decrypt(data: string): string {
  const key = getKey();
  const [ivHex, tagHex, encHex] = data.split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function shortHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
}