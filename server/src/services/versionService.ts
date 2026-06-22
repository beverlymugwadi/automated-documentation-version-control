import fs from 'node:fs/promises';
import path from 'node:path';
import simpleGit from 'simple-git';
import { env } from '../config/env';
import { dataStore, type VersionRec, type Author } from '../lib/dataStore';
import { shortHash } from '../lib/crypto';

export interface SaveVersionOptions {
  source?: VersionRec['source'];
  author?: Author;
}

const REPOS_DIR = path.resolve(__dirname, '../../.docrepos');
const DOC_FILE = 'document.md';

function repoDir(docId: string): string {
  return path.join(REPOS_DIR, docId);
}

async function commitToGit(docId: string, content: string, message: string): Promise<string> {
  const dir = repoDir(docId);
  await fs.mkdir(dir, { recursive: true });
  const git = simpleGit(dir);
  if (!(await git.checkIsRepo().catch(() => false))) {
    await git.init();
    await git.addConfig('user.name', 'ADGVC');
    await git.addConfig('user.email', 'adgvc@local');
    await git.raw(['symbolic-ref', 'HEAD', 'refs/heads/main']).catch(() => undefined);
  }
  await fs.writeFile(path.join(dir, DOC_FILE), content, 'utf8');
  await git.add(DOC_FILE);
  await git.commit(message);
  return (await git.revparse(['HEAD'])).trim();
}

export async function saveDocVersion(
  docId: string,
  content: string,
  message: string,
  opts: SaveVersionOptions = {},
): Promise<VersionRec> {
  const existing = await dataStore.listVersions(docId);
  const versionNo = existing.length + 1;

  let commitHash: string;
  if (env.mockMode) {
    commitHash = shortHash(`${docId}:${versionNo}:${content.length}:${Date.now()}`);
  } else {
    commitHash = await commitToGit(docId, content, message);
  }

  const version = await dataStore.addVersion({
    docId,
    versionNo,
    commitHash,
    content,
    message,
    source: opts.source ?? 'edit',
    author: opts.author,
  });
  await dataStore.updateDoc(docId, { content, currentVersion: versionNo });
  return version;
}

export async function removeDocRepo(docId: string): Promise<void> {
  await fs.rm(repoDir(docId), { recursive: true, force: true }).catch(() => undefined);
}

export function shortCommit(hash: string | null): string {
  return hash ? hash.slice(0, 7) : '—';
}