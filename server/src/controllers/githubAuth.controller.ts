import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { asyncHandler } from '../lib/asyncHandler';
import { env } from '../config/env';
import { signToken, authCookieOptions, AUTH_COOKIE, verifyToken } from '../lib/jwt';
import { encrypt as encryptSecret } from '../lib/crypto';
import { userStore } from '../lib/userStore';
import { buildAuthorizeUrl, exchangeCodeForUser } from '../services/githubService';
import { HttpError } from '../middleware/errorHandler';

const STATE_COOKIE = 'gh_oauth_state';

function issueSession(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE, signToken(userId), authCookieOptions());
}

export const githubStart = asyncHandler(async (req: Request, res: Response) => {
  if (!env.githubConfigured) {
    throw new HttpError(501, 'GitHub OAuth is not configured on this server.');
  }

  const nonce = crypto.randomBytes(16).toString('hex');

  // If a user is already logged in to ADGVC, embed their ID in the state so
  // the callback links GitHub to their existing account instead of creating
  // a new one based on email.
  let linkUserId = '';
  const authCookie = (req.cookies as Record<string, string>)[AUTH_COOKIE];
  if (authCookie) {
    try { linkUserId = verifyToken(authCookie).sub; } catch { /* not logged in */ }
  }

  const state = Buffer.from(JSON.stringify({ nonce, linkUserId })).toString('base64url');
  res.cookie(STATE_COOKIE, nonce, { httpOnly: true, sameSite: 'lax', maxAge: 600_000 });
  res.redirect(buildAuthorizeUrl(state));
});

export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  if (!env.githubConfigured) {
    res.redirect(`${env.clientUrl}/dashboard`);
    return;
  }

  const { code, state } = req.query as { code?: string; state?: string };
  if (!code) throw new HttpError(400, 'Missing OAuth code');

  let nonce = '';
  let linkUserId = '';
  try {
    const decoded = JSON.parse(
      Buffer.from(state ?? '', 'base64url').toString('utf8'),
    ) as { nonce?: string; linkUserId?: string };
    nonce = decoded.nonce ?? '';
    linkUserId = decoded.linkUserId ?? '';
  } catch {
    throw new HttpError(400, 'Invalid OAuth state');
  }

  if (!nonce || nonce !== (req.cookies as Record<string, string>)[STATE_COOKIE]) {
    throw new HttpError(400, 'OAuth state mismatch — please try connecting again.');
  }
  res.clearCookie(STATE_COOKIE);

  const gh = await exchangeCodeForUser(code);

  let user;
  if (linkUserId) {
    // User was already logged in to ADGVC — link the GitHub account they just
    // authorized to their existing ADGVC account.
    user = await userStore.findById(linkUserId);
    if (!user) throw new HttpError(404, 'ADGVC account not found.');
  } else {
    // Standalone GitHub login — find an existing account by GitHub ID first,
    // then fall back to email, then create a new account.
    user = await userStore.findByGithubId(gh.githubId);
    if (!user && gh.email) {
      user = await userStore.findByEmail(gh.email);
    }
    if (!user) {
      const email = gh.email ?? `${gh.login}@users.noreply.github.com`;
      user = await userStore.create({ fullName: gh.name ?? gh.login, email, passwordHash: '' });
    }
  }

  await userStore.linkGithub(user.userId, {
    githubId: gh.githubId,
    githubLogin: gh.login,
    avatarUrl: gh.avatarUrl,
    encryptedToken: encryptSecret(gh.accessToken),
  });

  issueSession(res, user.userId);
  res.redirect(`${env.clientUrl}/dashboard`);
});

export const githubDisconnect = asyncHandler(async (req: Request, res: Response) => {
  await userStore.unlinkGithub(req.user!.userId);
  res.json({ ok: true });
});
