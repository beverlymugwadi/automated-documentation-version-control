import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { env } from '../config/env';
import { dataStore, type DocRec } from '../lib/dataStore';
import { resolveGithubToken } from '../lib/githubToken';
import { commitFile, parseRepo, GithubScopeError } from '../services/githubService';
import { roleOf } from '../lib/access';
import { shortHash } from '../lib/crypto';
import { HttpError } from '../middleware/errorHandler';

async function ownedDoc(docId: string, userId: string): Promise<DocRec> {
  const doc = await dataStore.getDoc(docId);
  if (!doc) throw new HttpError(404, 'Documentation not found.');
  const project = await dataStore.getProject(doc.projectId);
  if (!((project && roleOf(project, userId)) || doc.userId === userId)) {
    throw new HttpError(403, 'You do not have access to this document.');
  }
  return doc;
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

const commitSchema = z.object({
  repoFullName: z.string().min(1),
  branch: z.string().min(1).default('main'),
  path: z.string().min(1),
  message: z.string().min(1).max(280),
});

export const commitToGithub = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  const { repoFullName, branch, path, message } = req.body as z.infer<typeof commitSchema>;
  const finalPath = path || `docs/${slug(doc.title)}.md`;

  let result: { commitSha: string; commitUrl: string };

  if (env.mockMode) {
    const sha = shortHash(`${repoFullName}:${finalPath}:${Date.now()}`).padEnd(40, '0');
    result = { commitSha: sha, commitUrl: `https://github.com/${repoFullName}/commit/${sha.slice(0, 7)}` };
  } else {
    const token = await resolveGithubToken(req.user!.userId);
    if (!token) throw new HttpError(401, 'Connect GitHub to publish documentation.');
    const { owner, repo } = parseRepo(repoFullName);
    try {
      const r = await commitFile(token, { owner, repo, path: finalPath, branch, message, content: doc.content });
      result = { commitSha: r.commitSha, commitUrl: r.commitUrl };
    } catch (err) {
      if (err instanceof GithubScopeError) {
        res.status(403).json({ error: { code: 'GITHUB_WRITE_SCOPE_REQUIRED', message: err.message } });
        return;
      }
      throw err;
    }
  }

  await dataStore.setVersionExternalCommit(doc.docId, doc.currentVersion, { sha: result.commitSha, url: result.commitUrl });

  res.status(201).json({ committed: true, path: finalPath, branch, repoFullName, commitSha: result.commitSha, commitUrl: result.commitUrl });
});

export const schemas = { commitSchema };