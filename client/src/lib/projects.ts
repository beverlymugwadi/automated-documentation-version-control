import { api } from './api';

export type Role = 'owner' | 'editor';

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  description: string;
  repoFullName: string | null;
  docCount: number;
  memberCount: number;
  role: Role | null;
  updatedAt: string;
}

export interface Member {
  userId: string;
  login: string;
  avatarUrl?: string;
  role: Role;
  addedAt: string;
}

export interface ProjectDetail {
  projectId: string;
  projectName: string;
  description: string;
  repoFullName: string | null;
  role: Role | null;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocSummary {
  docId: string;
  title: string;
  currentVersion: number;
  updatedAt: string;
}

export interface DeleteSummary {
  documents: number;
  versions: number;
  notes: number;
  sourceFiles: number;
  gitRepos: number;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data } = await api.get<{ projects: ProjectSummary[] }>('/projects');
  return data.projects;
}

export async function createProject(input: { projectName: string; description?: string }): Promise<ProjectDetail> {
  const { data } = await api.post<{ project: ProjectDetail }>('/projects', input);
  return data.project;
}

export async function getProject(projectId: string): Promise<{ project: ProjectDetail; documents: ProjectDocSummary[] }> {
  const { data } = await api.get<{ project: ProjectDetail; documents: ProjectDocSummary[] }>(`/projects/${projectId}`);
  return data;
}

export async function deleteProject(projectId: string): Promise<DeleteSummary> {
  const { data } = await api.delete<{ removed: DeleteSummary }>(`/projects/${projectId}`);
  return data.removed;
}

export async function addMember(projectId: string, identifier: string): Promise<Member[]> {
  const { data } = await api.post<{ members: Member[] }>(`/projects/${projectId}/members`, { identifier });
  return data.members;
}

export async function removeMember(projectId: string, userId: string): Promise<Member[]> {
  const { data } = await api.delete<{ members: Member[] }>(`/projects/${projectId}/members/${userId}`);
  return data.members;
}