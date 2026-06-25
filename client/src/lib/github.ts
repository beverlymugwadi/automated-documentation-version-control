import { api } from './api';

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  private: boolean;
  stargazers: number;
}

export interface TreeNode {
  path: string;
  type: 'file' | 'dir';
  documentable: boolean;
}

export async function fetchRepos(search?: string): Promise<{ repos: Repo[]; hasMore: boolean }> {
  const { data } = await api.get<{ repos: Repo[]; hasMore: boolean }>('/github/repos', {
    params: search ? { search } : undefined,
  });
  return data;
}

export interface TreeResult {
  tree: TreeNode[];
  /** The branch the server actually used — may differ from requested when the
   *  repo's default branch is 'master' but 'main' was requested. */
  branch: string;
}

export async function fetchTree(owner: string, repo: string, branch: string): Promise<TreeResult> {
  const { data } = await api.get<{ tree: TreeNode[]; branch: string }>(
    `/github/repos/${owner}/${repo}/tree`,
    { params: { branch } },
  );
  return { tree: data.tree, branch: data.branch };
}

export async function fetchFile(owner: string, repo: string, path: string, branch: string): Promise<{ path: string; content: string; sha: string }> {
  const { data } = await api.get<{ path: string; content: string; sha: string }>(
    `/github/repos/${owner}/${repo}/file`,
    { params: { path, branch } },
  );
  return data;
}