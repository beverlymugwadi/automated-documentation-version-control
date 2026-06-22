import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { asyncHandler } from '../lib/asyncHandler';
import { env } from '../config/env';
import { signToken, authCookieOptions, AUTH_COOKIE } from '../lib/jwt';
import { encryptSecret } from '../lib/crypto';
import { userStore } from '../lib/userStore';
import { buildAuthorizeUrl, exchangeCodeForUser } from '../services/githubService';
import { HttpError } from '../middleware/errorHandler';

const STATE_COOKIE = 'gh_oauth_state';

function issueSession(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE, signToken(userId), authCookieOptions());
}

export const githubStart = asyncHandler(async (_req: Request, res: Response) => {
  if (!env.githubConfigured) {
    const demo = await userStore.findByEmail('ada@adgvc.dev');
    if (!demo) throw new HttpError(500, 'Mock demo user is unavailable');
    await userStore.linkGithub(demo.userId, {
      githubId: 'gh_ada',
      githubLogin: 'ada',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
      encryptedToken: 'mock',
    });
    issueSession(res, demo.userId);
    res.redirect(`${env.clientUrl}/dashboard`);
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', maxAge: 600_000 });
  res.redirect(buildAuthorizeUrl(state));
});

export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  if (!env.githubConfigured) {
    const demo = await userStore.findByEmail('ada@adgvc.dev');
    if (demo) issueSession(res, demo.userId);
    res.redirect(`${env.clientUrl}/dashboard`);
    return;
  }

  const { code, state } = req.query as { code?: string; state?: string };
  if (!code) throw new HttpError(400, 'Missing OAuth code');
  if (!state || state !== req.cookies?.[STATE_COOKIE]) {
    throw new HttpError(400, 'OAuth state mismatch — please try connecting again.');
  }
  res.clearCookie(STATE_COOKIE);

  const gh = await exchangeCodeForUser(code);

  const email = gh.email ?? `${gh.login}@users.noreply.github.com`;
  let user = await userStore.findByEmail(email);
  if (!user) {
    user = await userStore.create({
      fullName: gh.name ?? gh.login,
      email,
      passwordHash: '',
    });
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