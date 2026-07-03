import { getDefaultBranch } from './githubService';

const API = 'https://api.github.com';

export interface ManifestSource {
  repoFullName: string;
  path: string;
  branch: string;
  commitSha: string;
  signatureHash?: string;
}

export interface ManifestEntry {
  docPath: string;
  sources: ManifestSource[];
  generatedAt: string;
  generator: 'ADGVC';
  authorLogin: string;
  version: number;
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
}

async function gh<T>(token: string, path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

const MANIFEST_PATH = 'docs/.adgvc/manifest.json';

/**
 * Read the current manifest from the repo, returning its entries and blob SHA
 * (needed to update it via the Contents API if we were to do single-file writes).
 * Returns null if the manifest does not exist yet.
 */
export async function readManifest(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ entries: ManifestEntry[]; sha: string } | null> {
  try {
    const data = await gh<{ content: string; encoding: string; sha: string }>(
      token,
      `/repos/${owner}/${repo}/contents/${MANIFEST_PATH}?ref=${branch}`,
    );
    const raw =
      data.encoding === 'base64'
        ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
        : data.content;
    const entries = JSON.parse(raw) as ManifestEntry[];
    return { entries: Array.isArray(entries) ? entries : [], sha: data.sha };
  } catch {
    return null;
  }
}

/** Build a fresh ManifestEntry for a generated document. */
export function buildManifestEntry(args: {
  docPath: string;
  sources: ManifestSource[];
  authorLogin: string;
  version: number;
}): ManifestEntry {
  return {
    docPath: args.docPath,
    sources: args.sources,
    generatedAt: new Date().toISOString(),
    generator: 'ADGVC',
    authorLogin: args.authorLogin,
    version: args.version,
  };
}

/**
 * Commit the documentation Markdown file AND an updated manifest.json
 * atomically in a single GitHub commit via the Git Trees API.
 */
export async function commitDocWithManifest(
  token: string,
  args: {
    owner: string;
    repo: string;
    branch: string;
    docPath: string;
    docContent: string;
    manifestEntry: ManifestEntry;
    commitMessage: string;
  },
): Promise<CommitResult> {
  const { owner, repo, docPath, docContent, manifestEntry, commitMessage } = args;

  // 1. Resolve the working branch — fall back to the repo's default if the
  //    requested branch doesn't exist (e.g. 'main' requested but repo uses 'master').
  let branch = args.branch;
  let headSha: string;
  try {
    const refData = await gh<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    );
    headSha = refData.object.sha;
  } catch {
    branch = await getDefaultBranch(token, owner, repo);
    const refData = await gh<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    );
    headSha = refData.object.sha;
  }

  const commitData = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${headSha}`,
  );
  const baseTreeSha = commitData.tree.sha;

  // 2. Read the existing manifest (to merge entries, not overwrite the whole file).
  let existingEntries: ManifestEntry[] = [];
  try {
    const existing = await readManifest(token, owner, repo, branch);
    if (existing) existingEntries = existing.entries;
  } catch { /* first commit — no manifest yet */ }

  // Upsert: replace entry for same docPath, add otherwise.
  const updatedEntries = [
    ...existingEntries.filter((e) => e.docPath !== manifestEntry.docPath),
    manifestEntry,
  ];
  const manifestContent = JSON.stringify(updatedEntries, null, 2);

  // 3. Create a new tree with both file blobs.
  const newTree = await gh<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          { path: docPath, mode: '100644', type: 'blob', content: docContent },
          { path: MANIFEST_PATH, mode: '100644', type: 'blob', content: manifestContent },
        ],
      }),
    },
  );

  // 4. Create the commit.
  const newCommit = await gh<{ sha: string; html_url: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [headSha],
      }),
    },
  );

  // 5. Advance the branch ref.
  await gh(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    },
  );

  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url,
  };
}

/**
 * Derive the docs/ path for a source file, mirroring its path under docs/.
 * e.g. "app/components/Error.tsx" → "docs/components/Error.md"
 *
 * Strips leading segment when it looks like a Next.js app-router directory
 * (app/, src/app/, pages/, src/) so the output is clean.
 */
export function mirroredDocPath(sourcePath: string): string {
  const stripped = sourcePath
    .replace(/^(src\/)?app\/(\(.*?\)\/)*/, '')   // strip Next.js app-router groups
    .replace(/^(src\/)?pages\//, '')              // strip pages/
    .replace(/^src\//, '');                       // strip bare src/
  const withoutExt = stripped.replace(/\.(tsx?|jsx?|mdx?)$/, '');
  return `docs/${withoutExt}.md`;
}
