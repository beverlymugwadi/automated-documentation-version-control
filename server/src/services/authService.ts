import bcrypt from 'bcryptjs';
import { userStore, toPublicUser, type PublicUser } from '../lib/userStore';
import { HttpError } from '../middleware/errorHandler';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: PublicUser;
  userId: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await userStore.findByEmail(input.email);
  if (existing) {
    throw new HttpError(409, 'That email is already registered. Try signing in instead.', {
      email: 'This email is already in use',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await userStore.create({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
  });

  return { user: toPublicUser(user), userId: user.userId };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await userStore.findByEmail(input.email);
  // Run a comparison even when the user is missing to avoid leaking which
  // emails exist via response timing.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(input.password, hash);

  if (!user || !ok) {
    throw new HttpError(401, 'Incorrect email or password.');
  }

  return { user: toPublicUser(user), userId: user.userId };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await userStore.findById(userId);
  if (!user) throw new HttpError(401, 'Your session is no longer valid. Please sign in again.');
  return toPublicUser(user);
}