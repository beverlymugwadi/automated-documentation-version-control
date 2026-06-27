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

export const githubStart = asyncHandler(async (req: Request, res: Response) => {
  if (!env.githubConfigured) {
    throw new HttpError(501, 'GitHub OAuth is not configured on this server.');
  }

  const nonce = crypto.randomBytes(16).toString('hex');

  // If a valid, EXISTING user is logged in, embed their ID so the callback
  // links GitHub to their account rather than creating a new one.
  // We verify the token AND confirm the user exists — a stale JWT for a deleted
  // user must not set linkUserId or it causes a spurious "not found" error.
  let linkUserId = '';
  const authCookie = (req.cookies as Record<string, string>)[AUTH_COOKIE];
  if (authCookie) {
    try {
      const { sub } = verifyToken(authCookie);
      const existing = await userStore.findById(sub);
      if (existing) linkUserId = sub;
    } catch { /* not logged in or invalid token */ }
  }

  console.log(`[githubStart] linkUserId=${linkUserId || '(none — standalone login)'}`);

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

  // Exchange the code for a GitHub access token and fetch the profile + email.
  const gh = await exchangeCodeForUser(code);
  console.log(`[githubCallback] GitHub profile received: login=${gh.login} id=${gh.githubId} email=${gh.email ?? '(none)'}`);

  let user;
  let action: 'linked' | 'found-by-github-id' | 'found-by-email' | 'created' = 'created';

  if (linkUserId) {
    // The user was already logged in to ADGVC and wants to link their GitHub account.
    user = await userStore.findById(linkUserId);
    if (user) {
      action = 'linked';
      console.log(`[githubCallback] Linking GitHub to existing account userId=${linkUserId}`);
    } else {
      // Stale cookie — the userId no longer exists in the database (e.g. user was
      // deleted, or cookie is from a different environment). Fall through to the
      // standalone find-or-create path below instead of throwing.
      console.warn(`[githubCallback] linkUserId=${linkUserId} not found in DB — falling back to standalone login`);
    }
  }

  if (!user) {
    // ── Find-or-create (standalone GitHub login) ──────────────────────────
    // Step 1: Look up by GitHub ID (most precise — survives email changes).
    user = await userStore.findByGithubId(gh.githubId);
    if (user) {
      action = 'found-by-github-id';
      console.log(`[githubCallback] Found existing user by githubId: userId=${user.userId}`);
    }

    // Step 2: Look up by primary email (links GitHub to an existing email/password account).
    if (!user && gh.email) {
      user = await userStore.findByEmail(gh.email);
      if (user) {
        action = 'found-by-email';
        console.log(`[githubCallback] Found existing user by email: userId=${user.userId} email=${gh.email}`);
      }
    }

    // Step 3: Create a brand-new account from the GitHub profile.
    if (!user) {
      // Use the GitHub primary email when available; fall back to the GitHub-provided
      // noreply address for accounts that keep email private.
      const email = gh.email ?? `${gh.login}@users.noreply.github.com`;
      action = 'created';
      console.log(`[githubCallback] Creating new user: login=${gh.login} email=${email}`);
      user = await userStore.create({
        fullName: gh.name ?? gh.login,
        email,
        passwordHash: '', // OAuth accounts have no password
      });
    }
  }

  // Store / update the GitHub credentials on the user record.
  await userStore.linkGithub(user.userId, {
    githubId: gh.githubId,
    githubLogin: gh.login,
    avatarUrl: gh.avatarUrl,
    encryptedToken: encryptSecret(gh.accessToken),
  });

  console.log(`[githubCallback] action=${action} userId=${user.userId} → issuing session`);

  // Set the httpOnly cookie (used when frontend and backend share the same origin).
  const token = signToken(user.userId);
  res.cookie(AUTH_COOKIE, token, authCookieOptions());

  // Pass the JWT in the redirect URL so the frontend can store it in Zustand
  // (localStorage) exactly like the email/password login does.  This is necessary
  // when frontend and backend are on different origins, because SameSite=Lax cookies
  // are not sent on cross-origin XHR requests, so the cookie alone is invisible to
  // subsequent API calls made by the browser.
  // Redirect to /login with the token as a query param.
  // /login is a guaranteed-deployed public route, so no routing issues.
  // The Login page detects ?github_token= and calls setSession() exactly
  // as email/password login does.
  res.redirect(`${env.clientUrl}/login?github_token=${encodeURIComponent(token)}`);
});

export const githubDisconnect = asyncHandler(async (req: Request, res: Response) => {
  await userStore.unlinkGithub(req.user!.userId);
  res.json({ ok: true });
});
