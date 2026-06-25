import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { dataStore, type DocRec } from '../lib/dataStore';
import { resolveGithubToken } from '../lib/githubToken';
import { parseRepo, GithubScopeError, BranchProtectedError } from '../services/githubService';
import {
  commitDocWithManifest,
  buildManifestEntry,
  mirroredDocPath,
} from '../services/githubManifest';
import { roleOf } from '../lib/access';
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

export const commitSchema = z.object({
  repoFullName: z.string().min(1),
  branch: z.string().min(1).default('main'),
  /** Path inside the repo for the generated Markdown file.
   *  Auto-derived from sourceBindings if absent. */
  docPath: z.string().optional(),
  message: z.string().min(1).max(280),
});

export const commitToGithub = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  const { repoFullName, branch, docPath: userDocPath, message } = req.body as z.infer<typeof commitSchema>;

  const token = await resolveGithubToken(req.user!.userId);
  if (!token) throw new HttpError(401, 'Connect GitHub to publish documentation.');

  // Derive the docs/ path: prefer user override, then mirror from first source binding,
  // then fall back to a slug of the document title.
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
  const firstSourcePath = doc.sourceBindings[0]?.path;
  const resolvedDocPath =
    userDocPath?.trim() ||
    (firstSourcePath ? mirroredDocPath(firstSourcePath) : `docs/${slug}.md`);

  const authorLogin = req.user!.githubLogin ?? req.user!.email ?? req.user!.fullName;

  const manifestEntry = buildManifestEntry({
    docPath: resolvedDocPath,
    sources: doc.sourceBindings.map((b) => ({
      repoFullName: b.repoFullName,
      path: b.path,
      branch: b.branch,
      commitSha: b.commitSha,
      signatureHash: b.signatureHash,
    })),
    authorLogin,
    version: doc.currentVersion,
  });

  const { owner, repo } = parseRepo(repoFullName);

  let result: { commitSha: string; commitUrl: string };
  try {
    result = await commitDocWithManifest(token, {
      owner,
      repo,
      branch,
      docPath: resolvedDocPath,
      docContent: doc.content,
      manifestEntry,
      commitMessage: message,
    });
  } catch (err) {
    if (err instanceof GithubScopeError) {
      res.status(403).json({ error: { code: 'GITHUB_WRITE_SCOPE_REQUIRED', message: err.message } });
      return;
    }
    if (err instanceof BranchProtectedError) {
      res.status(422).json({ error: { code: 'BRANCH_PROTECTED', message: err.message } });
      return;
    }
    // Surface the raw error message from GitHub for other failures (e.g. 409 merge conflict)
    const msg = (err as Error).message;
    if (msg.includes('409')) {
      res.status(422).json({ error: { code: 'BRANCH_PROTECTED', message: 'Changes must be made through a pull request. Use a different branch name.' } });
      return;
    }
    throw err;
  }

  await dataStore.setVersionExternalCommit(doc.docId, doc.currentVersion, {
    sha: result.commitSha,
    url: result.commitUrl,
  });

  res.status(201).json({
    committed: true,
    docPath: resolvedDocPath,
    branch,
    repoFullName,
    commitSha: result.commitSha,
    commitUrl: result.commitUrl,
    manifestPath: 'docs/.adgvc/manifest.json',
  });
});

export const schemas = { commitSchema };
