import { api } from './api';

export interface Version {
  versionId: string;
  versionNo: number;
  commitHash: string | null;
  message: string;
  source?: 'generate' | 'edit' | 'rollback' | 'regenerate';
  author?: { login: string; avatarUrl?: string } | null;
  externalCommit?: { sha: string; url: string } | null;
  createdAt: string;
}

export interface DiffLine {
  type: 'add' | 'del' | 'context' | 'meta';
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface Diff {
  lines: DiffLine[];
  stats: { additions: number; deletions: number };
}

export async function saveVersion(docId: string, content: string, message: string): Promise<Version> {
  const { data } = await api.post<{ version: Version }>(`/docs/${docId}/versions`, { content, message });
  return data.version;
}

export async function fetchVersions(docId: string): Promise<Version[]> {
  const { data } = await api.get<{ versions: Version[] }>(`/docs/${docId}/versions`);
  return data.versions;
}

export async function fetchVersionContent(docId: string, versionNo: number): Promise<string> {
  const { data } = await api.get<{ version: { content: string } }>(`/docs/${docId}/versions/${versionNo}`);
  return data.version.content;
}

export async function fetchDiff(docId: string, from: number, to: number): Promise<Diff> {
  const { data } = await api.get<{ diff: Diff }>(`/docs/${docId}/diff`, { params: { from, to } });
  return data.diff;
}

export async function rollback(docId: string, versionNo: number): Promise<void> {
  await api.post(`/docs/${docId}/rollback`, { versionNo });
}