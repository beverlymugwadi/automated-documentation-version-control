import type { Request } from 'express';
import type { Author, ProjectRec } from './dataStore';
import { dataStore } from './dataStore';
import { HttpError } from '../middleware/errorHandler';

export function authorFromReq(req: Request): Author {
  const u = req.user!;
  return {
    userId: u.userId,
    login: u.githubLogin || u.email || u.fullName,
    avatarUrl: u.avatarUrl,
  };
}

export function roleOf(project: ProjectRec, userId: string): 'owner' | 'editor' | null {
  if (project.userId === userId) return 'owner';
  const m = project.members.find((x) => x.userId === userId);
  return m ? m.role : null;
}

export async function requireProjectAccess(projectId: string, userId: string): Promise<ProjectRec> {
  const project = await dataStore.getProject(projectId);
  if (!project) throw new HttpError(404, 'Project not found.');
  if (!roleOf(project, userId)) throw new HttpError(403, 'You do not have access to this project.');
  return project;
}

export async function requireProjectOwner(projectId: string, userId: string): Promise<ProjectRec> {
  const project = await requireProjectAccess(projectId, userId);
  if (roleOf(project, userId) !== 'owner') throw new HttpError(403, 'Only the project owner can do that.');
  return project;
}