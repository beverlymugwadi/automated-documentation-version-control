'use strict';

const fs = require('fs/promises');
const path = require('path');
const simpleGit = require('simple-git');
const env = require('../config/env');

const DOC_FILENAME = 'document.md';

function repoPath(docId) {
  return path.join(env.docReposDir, String(docId));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function initRepo(docId) {
  const dir = repoPath(docId);
  await ensureDir(dir);
  const git = simpleGit(dir);

  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    await git.init();
    await git.addConfig('user.name', 'ADGVC');
    await git.addConfig('user.email', 'adgvc@local');
    await git.raw(['symbolic-ref', 'HEAD', 'refs/heads/main']).catch(() => {});
  }
  return git;
}

async function commitVersion(docId, content, message) {
  const dir = repoPath(docId);
  const git = await initRepo(docId);
  await fs.writeFile(path.join(dir, DOC_FILENAME), content, 'utf8');
  await git.raw(['add', '-f', DOC_FILENAME]);
  const result = await git.commit(message || 'Update documentation');
  const full = await git.revparse(['HEAD']);
  return {
    commitHash: full.trim(),
    summary: result.summary,
  };
}

async function readAtCommit(docId, commitHash) {
  const git = simpleGit(repoPath(docId));
  return git.show([`${commitHash}:${DOC_FILENAME}`]);
}

async function diffCommits(docId, hash1, hash2) {
  const git = simpleGit(repoPath(docId));
  const raw = await git.diff([hash1, hash2, '--', DOC_FILENAME]);

  const hunks = [];
  let current = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { header: line, lines: [] };
    } else if (current) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        current.lines.push({ type: 'add', text: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        current.lines.push({ type: 'remove', text: line.slice(1) });
      } else {
        current.lines.push({ type: 'context', text: line.slice(1) });
      }
    }
  }

  if (current) hunks.push(current);
  return hunks;
}

async function getLog(docId) {
  const git = simpleGit(repoPath(docId));
  const log = await git.log();
  return log.all;
}

module.exports = { commitVersion, readAtCommit, diffCommits, getLog, initRepo };