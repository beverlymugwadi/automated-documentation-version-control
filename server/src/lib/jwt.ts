import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string; // user id
}

/** Name of the httpOnly cookie that also carries the session token. */
export const AUTH_COOKIE = 'adgvc_token';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, env.jwtSecret, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

/** Standard cookie options for the auth token. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}