import { env } from '../config/env';
import { getFile, getFileSha, parseRepo } from './githubService';
import { shortHash } from '../lib/crypto';
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
const mockMutations = new Map<string, Map<string, { sha: string; content: string }>>();

export function isFlaggedOutdated(docId: string): boolean {
  return outdatedCache.get(docId) ?? false;
}

export function clearDrift(docId: string): void {
  outdatedCache.set(docId, false);
  mockMutations.delete(docId);
}

export function simulateDrift(doc: DocRec): number {
  const mutations = new Map<string, { sha: string; content: string }>();
  const stamp = new Date().toISOString();
  for (const b of doc.sourceBindings) {
    const note = `\n// upstream change @ ${stamp}\n`;
    const content = `${note}// (simulated edit for ${b.path})\n`;
    mutations.set(b.path, { sha: shortHash(b.path + stamp).padEnd(40, '0'), content });
  }
  mockMutations.set(doc.docId, mutations);
  outdatedCache.set(doc.docId, doc.sourceBindings.length > 0);
  return doc.sourceBindings.length;
}

export async function checkDrift(doc: DocRec, token: string | null): Promise<DriftResult> {
  const changedFiles: ChangedFile[] = [];

  for (const b of doc.sourceBindings) {
    let currentSha = b.commitSha;
    if (env.mockMode) {
      const mut = mockMutations.get(doc.docId)?.get(b.path);
      if (mut) currentSha = mut.sha;
    } else {
      const { owner, repo } = parseRepo(b.repoFullName);
      currentSha = (await getFileSha(token, owner, repo, b.path, b.branch)) ?? b.commitSha;
    }
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
    let content: string;
    let sha: string;
    if (env.mockMode) {
      const mut = mockMutations.get(doc.docId)?.get(b.path);
      if (mut) {
        content = mut.content;
        sha = mut.sha;
      } else {
        const { owner, repo } = parseRepo(b.repoFullName);
        const f = await getFile(null, owner, repo, b.path, b.branch);
        content = f.content;
        sha = f.sha;
      }
    } else {
      const { owner, repo } = parseRepo(b.repoFullName);
      const f = await getFile(token, owner, repo, b.path, b.branch);
      content = f.content;
      sha = f.sha;
    }
    files.push({ name: b.path, content });
    newBindings.push({ ...b, commitSha: sha });
  }

  return { files, newBindings };
}