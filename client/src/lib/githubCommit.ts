import { api } from './api';

export interface CommitResult {
  committed: true;
  path: string;
  branch: string;
  repoFullName: string;
  commitSha: string;
  commitUrl: string;
}

export class WriteScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriteScopeError';
  }
}

export async function commitToGithub(
  docId: string,
  input: { repoFullName: string; branch: string; path: string; message: string },
): Promise<CommitResult> {
  try {
    const { data } = await api.post<CommitResult>(`/docs/${docId}/commit-to-github`, input);
    return data;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (err as any)?.response?.data?.error;
    if (e?.code === 'GITHUB_WRITE_SCOPE_REQUIRED') throw new WriteScopeError(e.message);
    throw err;
  }
}