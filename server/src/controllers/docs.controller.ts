import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { dataStore, type DocRec } from '../lib/dataStore';
import { saveDocVersion } from '../services/versionService';
import { lineDiff } from '../lib/diff';
import { compose } from '../services/docComposer';
import { synthesize } from '../services/llmSynthesis';
import { checkDrift, simulateDrift, pullCurrentSource, isFlaggedOutdated, clearDrift } from '../services/driftService';
import { resolveGithubToken } from '../lib/githubToken';
import { authorFromReq, roleOf } from '../lib/access';
import { HttpError } from '../middleware/errorHandler';

async function ownedDoc(docId: string, userId: string): Promise<DocRec> {
  const doc = await dataStore.getDoc(docId);
  if (!doc) throw new HttpError(404, 'Documentation not found.');
  const project = await dataStore.getProject(doc.projectId);
  const hasAccess = (project && roleOf(project, userId)) || doc.userId === userId;
  if (!hasAccess) throw new HttpError(403, 'You do not have access to this document.');
  return doc;
}

function versionView(v: Awaited<ReturnType<typeof dataStore.listVersions>>[number]) {
  return {
    versionId: v.versionId,
    versionNo: v.versionNo,
    commitHash: v.commitHash,
    message: v.message,
    source: v.source,
    author: v.authorLogin ? { login: v.authorLogin, avatarUrl: v.authorAvatarUrl } : null,
    externalCommit: v.externalCommitUrl ? { sha: v.externalCommitSha, url: v.externalCommitUrl } : null,
    createdAt: v.createdAt,
  };
}

export const listDocs = asyncHandler(async (req: Request, res: Response) => {
  const docs = await dataStore.listDocsByUser(req.user!.userId);
  const projects = await dataStore.listProjects(req.user!.userId);
  const projectName = new Map(projects.map((p) => [p.projectId, p.projectName]));
  res.json({
    docs: docs.map((d) => ({
      docId: d.docId,
      title: d.title,
      projectId: d.projectId,
      projectName: projectName.get(d.projectId) ?? '—',
      sourceRepo: d.sourceRepo ?? null,
      currentVersion: d.currentVersion,
      updatedAt: d.updatedAt,
      outdated: isFlaggedOutdated(d.docId),
    })),
  });
});

export const getDoc = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  res.json({
    doc: {
      docId: doc.docId,
      title: doc.title,
      content: doc.content,
      currentVersion: doc.currentVersion,
      projectId: doc.projectId,
      sourceRepo: doc.sourceRepo ?? null,
      sourceBindings: doc.sourceBindings,
      outdated: isFlaggedOutdated(doc.docId),
      updatedAt: doc.updatedAt,
    },
  });
});

const saveSchema = z.object({
  content: z.string(),
  message: z.string().max(280).default('Manual edit'),
});

export const createVersion = asyncHandler(async (req: Request, res: Response) => {
  await ownedDoc(req.params.docId, req.user!.userId);
  const { content, message } = req.body as z.infer<typeof saveSchema>;
  const version = await saveDocVersion(req.params.docId, content, message, { source: 'edit', author: authorFromReq(req) });
  res.status(201).json({ version: versionView(version) });
});

export const listVersions = asyncHandler(async (req: Request, res: Response) => {
  await ownedDoc(req.params.docId, req.user!.userId);
  const versions = await dataStore.listVersions(req.params.docId);
  res.json({ versions: versions.map(versionView) });
});

export const getVersion = asyncHandler(async (req: Request, res: Response) => {
  await ownedDoc(req.params.docId, req.user!.userId);
  const version = await dataStore.getVersion(req.params.docId, Number(req.params.versionNo));
  if (!version) throw new HttpError(404, 'Version not found.');
  res.json({ version });
});

export const getDiff = asyncHandler(async (req: Request, res: Response) => {
  await ownedDoc(req.params.docId, req.user!.userId);
  const from = Number(req.query.from);
  const to = Number(req.query.to);
  if (!from || !to) throw new HttpError(400, 'Provide both `from` and `to` version numbers.');
  const [a, b] = await Promise.all([
    dataStore.getVersion(req.params.docId, from),
    dataStore.getVersion(req.params.docId, to),
  ]);
  if (!a || !b) throw new HttpError(404, 'One or both versions were not found.');
  const diff = lineDiff(a.content, b.content);
  res.json({ from: { versionNo: a.versionNo }, to: { versionNo: b.versionNo }, diff });
});

const rollbackSchema = z.object({ versionNo: z.number() });

export const rollbackVersion = asyncHandler(async (req: Request, res: Response) => {
  await ownedDoc(req.params.docId, req.user!.userId);
  const { versionNo } = req.body as z.infer<typeof rollbackSchema>;
  const target = await dataStore.getVersion(req.params.docId, versionNo);
  if (!target) throw new HttpError(404, 'Target version not found.');
  const version = await saveDocVersion(req.params.docId, target.content, `Rolled back to v${versionNo}`, {
    source: 'rollback',
    author: authorFromReq(req),
  });
  res.status(201).json({ version: versionView(version) });
});

export const drift = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  const token = await resolveGithubToken(req.user!.userId);
  const result = await checkDrift(doc, token);
  res.json(result);
});

export const simulate = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  if (doc.sourceBindings.length === 0) {
    throw new HttpError(400, 'This document has no bound source files to drift.');
  }
  const count = simulateDrift(doc);
  res.json({ ok: true, changed: count });
});

export const regenerate = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ownedDoc(req.params.docId, req.user!.userId);
  const token = await resolveGithubToken(req.user!.userId);

  if (doc.sourceBindings.length === 0) {
    throw new HttpError(400, 'This document has no bound source files to regenerate from.');
  }

  const { files, newBindings } = await pullCurrentSource(doc, token);
  const { markdown: ruleBasedMarkdown, structure } = compose({
    title: doc.title,
    notes: '',
    files,
    sourceRepo: doc.sourceRepo,
  });
  const { llmMarkdown, llmAvailable, llmError } = await synthesize(structure, files);

  await dataStore.updateDoc(doc.docId, { sourceBindings: newBindings, generatedAt: new Date().toISOString() });
  const version = await saveDocVersion(doc.docId, ruleBasedMarkdown, 'Regenerated from updated source', {
    source: 'regenerate',
    author: authorFromReq(req),
  });
  clearDrift(doc.docId);

  res.status(201).json({ version: versionView(version), ruleBasedMarkdown, llmMarkdown, llmAvailable, llmError });
});

export const schemas = { saveSchema, rollbackSchema };