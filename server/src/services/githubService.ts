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

async function gh<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
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

export async function getTree(
  token: string | null,
  owner: string,
  repo: string,
  branch: string,
): Promise<GhTreeNode[]> {
  if (!token) {
    return mockTree(`${owner}/${repo}`);
  }

  const ref = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
  );
  const tree = await gh<{ tree: Array<{ path: string; type: string }> }>(
    token,
    `/repos/${owner}/${repo}/git/trees/${ref.object.sha}?recursive=1`,
  );
  return tree.tree
    .map((n) => ({
      path: n.path,
      type: (n.type === 'tree' ? 'dir' : 'file') as 'dir' | 'file',
      documentable: n.type === 'blob' && DOCUMENTABLE.test(n.path),
    }))
    .filter((n) => n.type === 'dir' || n.documentable);
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
  return {
    accessToken,
    githubId: String(profile.id),
    login: profile.login,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  };
}