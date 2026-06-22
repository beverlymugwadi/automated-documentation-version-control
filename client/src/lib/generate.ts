import { api } from './api';

export interface GenerateInput {
  title?: string;
  notes: string;
  sourceRepo?: string;
  files: Array<{ name: string; content: string }>;
  bindings?: Array<{ repoFullName: string; path: string; branch: string; commitSha: string }>;
  projectId?: string;
}

export interface GenerateResult {
  docId: string;
  ruleBasedMarkdown: string;
  llmMarkdown: string | null;
  llmAvailable: boolean;
  llmError?: string;
  generationMs: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structure: any;
}

export async function generateDoc(input: GenerateInput): Promise<GenerateResult> {
  const { data } = await api.post<GenerateResult>('/generate', input);
  return data;
}