import { api } from './api';

export interface CommitResult {
  committed: true;
  docPath: string;
  branch: string;
  repoFullName: string;
  commitSha: string;
  commitUrl: string;
  manifestPath: string;
}

export class WriteScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriteScopeError';
  }
}

export class BranchProtectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BranchProtectedError';
  }
}

export async function commitToGithub(
  docId: string,
  input: { repoFullName: string; branch: string; docPath?: string; message: string },
): Promise<CommitResult> {
  try {
    const { data } = await api.post<CommitResult>(`/docs/${docId}/commit-to-github`, input);
    return data;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (err as any)?.response?.data?.error;
    if (e?.code === 'GITHUB_WRITE_SCOPE_REQUIRED') throw new WriteScopeError(e.message);
    if (e?.code === 'BRANCH_PROTECTED') throw new BranchProtectedError(e.message);
    throw err;
  }
}
