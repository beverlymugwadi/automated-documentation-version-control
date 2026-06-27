import { env } from '../config/env';
import { shortHash } from '../lib/crypto';
import {
  MOCK_REPOS,
  mockTree,
  mockFile,
  type GhRepo,
  type GhTreeNode,
} from '../lib/githubFixtures';

const DOCUMENTABLE = /\.(jsx?|tsx?|mdx?)$/i;
const API = 'https://api.github.com';

export class GithubScopeError extends Error {
  constructor(message = 'ADGVC needs write access to commit. Reconnect GitHub to grant it.') {
    super(message);
    this.name = 'GithubScopeError';
  }
}

export class BranchProtectedError extends Error {
  constructor() {
    super('This branch is protected and requires a pull request. Commit to a new branch (e.g. docs/update) and open a PR on GitHub.');
    this.name = 'BranchProtectedError';
  }
}

async function gh<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ADGVC/1.0',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

function mockSha(input: string): string {
  return shortHash(input).padEnd(40, '0');
}

export interface ListReposOptions {
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listRepos(
  token: string | null,
  opts: ListReposOptions = {},
): Promise<{ repos: GhRepo[]; page: number; hasMore: boolean }> {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 30;

  if (!token) {
    let repos = MOCK_REPOS;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      repos = repos.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
      );
    }
    return { repos, page, hasMore: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await gh<any[]>(token, `/user/repos?sort=updated&per_page=${perPage}&page=${page}`);
  let repos: GhRepo[] = raw.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
    private: r.private,
    stargazers: r.stargazers_count,
  }));
  if (opts.search) {
    const q = opts.search.toLowerCase();
    repos = repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }
  return { repos, page, hasMore: raw.length === perPage };
}

/**
 * Fetch the repository's default branch name (e.g. "main", "master", "develop").
 * Used as a fallback when the caller passes a branch name that doesn't exist.
 */
export async function getDefaultBranch(token: string, owner: string, repo: string): Promise<string> {
  const data = await gh<{ default_branch: string }>(token, `/repos/${owner}/${repo}`);
  return data.default_branch;
}

/**
 * Resolve the branch to use for a repo.  Tries `requestedBranch` first; if
 * GitHub returns 409 (ref not found) or any other error, falls back to the
 * repo's actual default branch.
 */
async function resolveBranch(token: string, owner: string, repo: string, requestedBranch: string): Promise<string> {
  try {
    await gh<unknown>(token, `/repos/${owner}/${repo}/git/ref/heads/${requestedBranch}`);
    return requestedBranch;
  } catch {
    return getDefaultBranch(token, owner, repo);
  }
}

export async function getTree(
  token: string | null,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: GhTreeNode[]; resolvedBranch: string }> {
  if (!token) {
    return { tree: mockTree(`${owner}/${repo}`), resolvedBranch: branch };
  }

  // Auto-detect the correct branch — '409 ref not found' when 'main' is requested
  // but the repo uses 'master' (or any other name).
  const resolvedBranch = await resolveBranch(token, owner, repo, branch);

  const ref = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${resolvedBranch}`,
  );
  const treeData = await gh<{ tree: Array<{ path: string; type: string }> }>(
    token,
    `/repos/${owner}/${repo}/git/trees/${ref.object.sha}?recursive=1`,
  );
  return {
    tree: treeData.tree
      .map((n) => ({
        path: n.path,
        type: (n.type === 'tree' ? 'dir' : 'file') as 'dir' | 'file',
        documentable: n.type === 'blob' && DOCUMENTABLE.test(n.path),
      }))
      .filter((n) => n.type === 'dir' || n.documentable),
    resolvedBranch,
  };
}

export async function getFile(
  token: string | null,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<{ path: string; content: string; sha: string }> {
  if (!token) {
    const content = mockFile(path);
    return { path, content, sha: mockSha(`${owner}/${repo}:${path}:${content}`) };
  }

  const data = await gh<{ content: string; encoding: string; sha: string }>(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
  );
  const content =
    data.encoding === 'base64'
      ? Buffer.from(data.content, 'base64').toString('utf8')
      : data.content;
  return { path, content, sha: data.sha };
}

/**
 * Fetch the raw text content of a file by its blob SHA using the Git Blobs API.
 * Unlike the Contents API, this endpoint accepts a blob SHA directly — which is
 * exactly what we store in sourceBindings.commitSha.
 */
export async function getBlobContent(
  token: string,
  owner: string,
  repo: string,
  blobSha: string,
): Promise<string> {
  const data = await gh<{ content: string; encoding: string }>(
    token,
    `/repos/${owner}/${repo}/git/blobs/${blobSha}`,
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  }
  return data.content;
}

export async function getFileSha(
  token: string | null,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | null> {
  if (!token) {
    const content = mockFile(path);
    return mockSha(`${owner}/${repo}:${path}:${content}`);
  }
  try {
    const data = await gh<{ sha: string }>(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    );
    return data.sha;
  } catch {
    return null;
  }
}

export async function commitFile(
  token: string,
  args: {
    owner: string;
    repo: string;
    path: string;
    branch: string;
    message: string;
    content: string;
  },
): Promise<{ commitSha: string; commitUrl: string; contentSha: string }> {
  const base = `/repos/${args.owner}/${args.repo}/contents/${args.path.split('/').map(encodeURIComponent).join('/')}`;
  let existingSha: string | undefined;
  try {
    const existing = await gh<{ sha: string }>(token, `${base}?ref=${args.branch}`);
    existingSha = existing.sha;
  } catch {
    existingSha = undefined;
  }

  const res = await fetch(`${API}${base}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: args.message,
      content: Buffer.from(args.content, 'utf8').toString('base64'),
      branch: args.branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (res.status === 403 || res.status === 404) {
    throw new GithubScopeError();
  }
  if (res.status === 409) {
    throw new BranchProtectedError();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub commit failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    commit: { sha: string; html_url: string };
    content: { sha: string };
  };
  return { commitSha: data.commit.sha, commitUrl: data.commit.html_url, contentSha: data.content.sha };
}

export function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: env.github.scope.split(',').join(' '),
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForUser(code: string): Promise<{
  accessToken: string;
  githubId: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
      redirect_uri: env.github.callbackUrl,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) {
    throw new Error(tokenJson.error ?? 'Failed to obtain GitHub access token');
  }
  const accessToken = tokenJson.access_token;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await gh<any>(accessToken, '/user');

  // /user returns null when the user's email is set to private.
  // Fall back to /user/emails which always returns verified addresses.
  let email = (profile.email as string | null) ?? null;
  if (!email) {
    try {
      const emails = await gh<Array<{ email: string; primary: boolean; verified: boolean }>>(
        accessToken,
        '/user/emails',
      );
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    } catch { /* scope may not include user:email — proceed without */ }
  }

  return {
    accessToken,
    githubId: String(profile.id),
    login: profile.login,
    name: profile.name,
    email,
    avatarUrl: profile.avatar_url,
  };
}