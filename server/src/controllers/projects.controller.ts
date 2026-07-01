import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { dataStore, type Member } from '../lib/dataStore';
import { userStore } from '../lib/userStore';
import { removeDocRepo } from '../services/versionService';
import { requireProjectAccess, requireProjectOwner, roleOf, authorFromReq } from '../lib/access';
import { HttpError } from '../middleware/errorHandler';
import { sendCollaboratorInvite } from '../services/emailService';
import { env } from '../config/env';

const createProjectSchema = z.object({
  projectName: z.string().trim().min(1, 'Project name is required').max(140),
  description: z.string().trim().max(1000).default(''),
  repoFullName: z.string().trim().optional(),
});

const updateProjectSchema = z.object({
  projectName: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { projectName, description, repoFullName } = req.body as z.infer<typeof createProjectSchema>;
  const project = await dataStore.createProject({
    userId: req.user!.userId,
    projectName,
    description,
    repoFullName: repoFullName || undefined,
    owner: authorFromReq(req),
  });
  res.status(201).json({ project });
});

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const projects = await dataStore.listProjects(userId);
  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const docs = await dataStore.listDocsByProject(p.projectId);
      return {
        projectId: p.projectId,
        projectName: p.projectName,
        description: p.description,
        repoFullName: p.repoFullName ?? null,
        docCount: docs.length,
        memberCount: p.members.length,
        role: roleOf(p, userId),
        updatedAt: p.updatedAt,
      };
    }),
  );
  res.json({ projects: withCounts });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const project = await requireProjectAccess(req.params.projectId, userId);
  const docs = await dataStore.listDocsByProject(project.projectId);
  res.json({
    project: {
      projectId: project.projectId,
      projectName: project.projectName,
      description: project.description,
      repoFullName: project.repoFullName ?? null,
      role: roleOf(project, userId),
      members: project.members,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    documents: docs.map((d) => ({
      docId: d.docId,
      title: d.title,
      currentVersion: d.currentVersion,
      updatedAt: d.updatedAt,
    })),
  });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  await requireProjectOwner(req.params.projectId, req.user!.userId);
  const patch = updateProjectSchema.parse(req.body);
  const project = await dataStore.updateProject(req.params.projectId, patch);
  if (!project) throw new HttpError(404, 'Project not found');
  res.json({ project });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  await requireProjectOwner(req.params.projectId, req.user!.userId);
  const summary = await dataStore.deleteProject(req.params.projectId);
  await Promise.all(summary.docIds.map((docId) => removeDocRepo(docId)));
  res.json({
    removed: {
      documents: summary.documents,
      versions: summary.versions,
      notes: summary.notes,
      sourceFiles: summary.files,
      gitRepos: summary.docIds.length,
    },
  });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const project = await requireProjectAccess(req.params.projectId, req.user!.userId);
  res.json({ members: project.members, role: roleOf(project, req.user!.userId) });
});

const addMemberSchema = z.object({
  identifier: z.string().min(1),
  role: z.enum(['editor']).default('editor'),
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  await requireProjectOwner(req.params.projectId, req.user!.userId);
  const { identifier } = req.body as z.infer<typeof addMemberSchema>;

  const user =
    (await userStore.findByLogin(identifier)) ??
    (identifier.includes('@') ? await userStore.findByEmail(identifier) : null);
  if (!user) {
    throw new HttpError(404, `No ADGVC user found for "${identifier}". They must sign in once before being added.`);
  }

  const member: Member = {
    userId: user.userId,
    login: user.githubLogin ?? user.email,
    avatarUrl: user.avatarUrl,
    role: 'editor',
    addedAt: new Date().toISOString(),
  };
  const project = await dataStore.addMember(req.params.projectId, member);

  // fire-and-forget — member is already saved; don't fail the request if email errors
  const inviterName = req.user!.fullName || req.user!.githubLogin || req.user!.email;
  const projectUrl = `${env.clientUrl}/projects/${req.params.projectId}`;
  sendCollaboratorInvite({
    toEmail: user.email,
    toName: user.fullName,
    projectName: project?.projectName ?? 'a project',
    invitedByName: inviterName,
    projectUrl,
  }).catch((err) => console.error('[email] collaborator invite failed:', err));

  res.status(201).json({ members: project?.members ?? [] });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await requireProjectOwner(req.params.projectId, req.user!.userId);
  const project = await dataStore.removeMember(req.params.projectId, req.params.userId);
  res.json({ members: project?.members ?? [] });
});

export const schemas = { addMemberSchema, updateProjectSchema };