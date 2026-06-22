import { api } from './api';

export interface DocSummary {
  docId: string;
  title: string;
  projectId: string;
  projectName: string;
  sourceRepo: string | null;
  currentVersion: number;
  updatedAt: string;
  outdated: boolean;
}

export interface SourceBinding {
  repoFullName: string;
  path: string;
  branch: string;
  commitSha: string;
}

export interface DocDetail {
  docId: string;
  title: string;
  content: string;
  currentVersion: number;
  projectId: string;
  sourceRepo: string | null;
  sourceBindings: SourceBinding[];
  outdated: boolean;
  updatedAt: string;
}

export async function listDocs(): Promise<DocSummary[]> {
  const { data } = await api.get<{ docs: DocSummary[] }>('/docs');
  return data.docs;
}

export async function getDoc(docId: string): Promise<DocDetail> {
  const { data } = await api.get<{ doc: DocDetail }>(`/docs/${docId}`);
  return data.doc;
}