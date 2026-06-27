import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { verifyToken, AUTH_COOKIE } from '../lib/jwt';
import { getCurrentUser } from '../services/authService';
import { HttpError } from './errorHandler';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const fromCookie = req.cookies?.[AUTH_COOKIE];
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  // Prefer the explicit Authorization header over the cookie.
  const token = fromHeader || fromCookie;

  console.log(`[requireAuth] ${req.method} ${req.path} — header:${fromHeader ? 'yes' : 'NO'} cookie:${fromCookie ? 'yes' : 'NO'} using:${fromHeader ? 'header' : fromCookie ? 'cookie' : 'NONE'}`);

  if (!token) {
    console.log('[requireAuth] 401 — no token at all');
    throw new HttpError(401, 'Authentication required.');
  }

  let userId: string;
  try {
    userId = verifyToken(token).sub;
    console.log(`[requireAuth] token verified — userId=${userId}`);
  } catch (err) {
    console.log('[requireAuth] 401 — token verification failed:', (err as Error).message);
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  req.user = await getCurrentUser(userId);
  next();
});