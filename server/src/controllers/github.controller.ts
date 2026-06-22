import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { resolveGithubToken as resolveToken } from '../lib/githubToken';
import { listRepos, getTree, getFile } from '../services/githubService';
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
  const branch = (req.query.branch as string) || 'main';
  const nodes = await getTree(token, owner, repo, branch);
  res.json({ owner, repo, branch, tree: nodes });
});

/** GET /api/github/repos/:owner/:repo/file?path=&branch= */
export const file = asyncHandler(async (req: Request, res: Response) => {
  const token = await resolveToken(req.user!.userId);
  const { owner, repo } = req.params;
  const path = req.query.path as string;
  const branch = (req.query.branch as string) || 'main';
  if (!path) throw new HttpError(400, 'A file `path` is required');
  const result = await getFile(token, owner, repo, path, branch);
  res.json(result);
});