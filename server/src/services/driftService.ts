import { getFile, getFileSha, parseRepo } from './githubService';
import type { DocRec, SourceBinding } from '../lib/dataStore';

export interface ChangedFile {
  path: string;
  oldSha: string;
  newSha: string;
  changedAt: string;
}

export interface DriftResult {
  isOutdated: boolean;
  changedFiles: ChangedFile[];
}

const outdatedCache = new Map<string, boolean>();

export function isFlaggedOutdated(docId: string): boolean {
  return outdatedCache.get(docId) ?? false;
}

export function clearDrift(docId: string): void {
  outdatedCache.set(docId, false);
}

export function simulateDrift(doc: DocRec): number {
  outdatedCache.set(doc.docId, doc.sourceBindings.length > 0);
  return doc.sourceBindings.length;
}

export async function checkDrift(doc: DocRec, token: string | null): Promise<DriftResult> {
  const changedFiles: ChangedFile[] = [];

  for (const b of doc.sourceBindings) {
    const { owner, repo } = parseRepo(b.repoFullName);
    const currentSha = (await getFileSha(token, owner, repo, b.path, b.branch)) ?? b.commitSha;
    if (currentSha !== b.commitSha) {
      changedFiles.push({ path: b.path, oldSha: b.commitSha, newSha: currentSha, changedAt: new Date().toISOString() });
    }
  }

  const isOutdated = changedFiles.length > 0;
  outdatedCache.set(doc.docId, isOutdated);
  return { isOutdated, changedFiles };
}

export async function pullCurrentSource(
  doc: DocRec,
  token: string | null,
): Promise<{ files: Array<{ name: string; content: string }>; newBindings: SourceBinding[] }> {
  const files: Array<{ name: string; content: string }> = [];
  const newBindings: SourceBinding[] = [];

  for (const b of doc.sourceBindings) {
    const { owner, repo } = parseRepo(b.repoFullName);
    const f = await getFile(token, owner, repo, b.path, b.branch);
    files.push({ name: b.path, content: f.content });
    newBindings.push({ ...b, commitSha: f.sha });
  }

  return { files, newBindings };
}