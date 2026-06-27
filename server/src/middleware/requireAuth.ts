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
  // The frontend always sends a Bearer token (from Zustand) when logged in.
  // The cookie may be stale (expired, or signed with a different JWT_SECRET
  // after a re-deploy) and would shadow a perfectly valid Bearer token if
  // given priority.  Falling back to the cookie handles edge cases where no
  // Bearer is present (e.g. direct link with only a browser cookie active).
  const token = fromHeader || fromCookie;

  if (!token) {
    throw new HttpError(401, 'Authentication required.');
  }

  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  req.user = await getCurrentUser(userId);
  next();
});