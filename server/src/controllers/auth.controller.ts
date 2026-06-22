import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { signToken, authCookieOptions, AUTH_COOKIE } from '../lib/jwt';
import { registerUser, loginUser } from '../services/authService';
import { HttpError } from '../middleware/errorHandler';

/* ---- Validation schemas ---------------------------------- */
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

/* ---- Controllers ----------------------------------------- */

/** Issue the session: set the httpOnly cookie and also return the bearer token. */
function issueSession(res: Response, userId: string): string {
  const token = signToken(userId);
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  return token;
}

/** POST /api/auth/register */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, userId } = await registerUser(req.body);
  const token = issueSession(res, userId);
  res.status(201).json({ user, token });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, userId } = await loginUser(req.body);
  const token = issueSession(res, userId);
  res.json({ user, token });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

/** GET /api/auth/me — requires auth; req.user is set by requireAuth. */
export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Authentication required.');
  res.json({ user: req.user });
});