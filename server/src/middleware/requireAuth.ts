import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { verifyToken, AUTH_COOKIE } from '../lib/jwt';
import { getCurrentUser } from '../services/authService';
import { HttpError } from './errorHandler';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const fromCookie = req.cookies?.[AUTH_COOKIE];
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = fromCookie || fromHeader;

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