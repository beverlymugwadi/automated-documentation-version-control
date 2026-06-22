import { api } from './api';

export interface ChangedFile {
  path: string;
  oldSha: string;
  newSha: string;
  changedAt: string;
}

export interface DriftResult {
  isOutdated: boolean;
  changedFiles: ChangedFile[];
}

export async function checkDrift(docId: string): Promise<DriftResult> {
  const { data } = await api.get<DriftResult>(`/docs/${docId}/drift`);
  return data;
}

export async function simulateDrift(docId: string): Promise<void> {
  await api.post(`/docs/${docId}/simulate-drift`);
}

export interface RegenerateResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  version: any;
  ruleBasedMarkdown: string;
  llmMarkdown: string | null;
  llmAvailable: boolean;
}

export async function regenerateDoc(docId: string): Promise<RegenerateResult> {
  const { data } = await api.post<RegenerateResult>(`/docs/${docId}/regenerate`);
  return data;
}