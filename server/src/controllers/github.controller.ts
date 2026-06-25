import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { resolveGithubToken as resolveToken } from '../lib/githubToken';
import { listRepos, getTree, getFile, getDefaultBranch } from '../services/githubService';
import { HttpError } from '../middleware/errorHandler';

/** GET /api/github/repos?search=&page= */
export const repos = asyncHandler(async (req: Request, res: Response) => {
  const token = await resolveToken(req.user!.userId);
  const search = (req.query.search as string) || undefined;
  const page = req.query.page ? Number(req.query.page) : 1;
  const result = await listRepos(token, { search, page });
  res.json(result);
});

/** GET /api/github/repos/:owner/:repo/tree?branch= */
export const tree = asyncHandler(async (req: Request, res: Response) => {
  const token = await resolveToken(req.user!.userId);
  const { owner, repo } = req.params;
  const requestedBranch = (req.query.branch as string) || 'main';
  const { tree: nodes, resolvedBranch } = await getTree(token, owner, repo, requestedBranch);
  // Return resolvedBranch so the client knows the actual branch (may differ from requested)
  res.json({ owner, repo, branch: resolvedBranch, tree: nodes });
});

/** GET /api/github/repos/:owner/:repo/file?path=&branch= */
export const file = asyncHandler(async (req: Request, res: Response) => {
  const token = await resolveToken(req.user!.userId);
  const { owner, repo } = req.params;
  const path = req.query.path as string;
  const requestedBranch = (req.query.branch as string) || 'main';
  if (!path) throw new HttpError(400, 'A file `path` is required');

  // If the requested branch doesn't exist, fall back to the default branch so
  // file fetches work even when the client still holds a stale branch name.
  let branch = requestedBranch;
  try {
    const result = await getFile(token, owner, repo, path, branch);
    res.json(result);
  } catch {
    if (token) {
      branch = await getDefaultBranch(token, owner, repo);
    }
    const result = await getFile(token, owner, repo, path, branch);
    res.json(result);
  }
});
