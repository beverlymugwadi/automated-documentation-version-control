import { Project } from '../models/Project';
import { Documentation } from '../models/Documentation';
import { DocVersion } from '../models/DocVersion';
import { DeveloperNote } from '../models/DeveloperNote';
import { SourceCodeFile } from '../models/SourceCodeFile';

export interface Author {
  userId: string;
  login: string;
  avatarUrl?: string;
}

export interface Member {
  userId: string;
  login: string;
  avatarUrl?: string;
  role: 'owner' | 'editor';
  addedAt: string;
}

export interface SourceBinding {
  repoFullName: string;
  path: string;
  branch: string;
  commitSha: string;
  /** sha256 of exported signatures at generation time — used for three-state drift detection. */
  signatureHash?: string;
}

export interface ProjectRec {
  projectId: string;
  userId: string;
  projectName: string;
  description: string;
  repoFullName?: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface DocRec {
  docId: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  format: 'markdown';
  currentVersion: number;
  sourceRepo?: string;
  sourceBindings: SourceBinding[];
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionRec {
  versionId: string;
  docId: string;
  versionNo: number;
  commitHash: string | null;
  content: string;
  message: string;
  source: 'generate' | 'edit' | 'rollback' | 'regenerate';
  authorId?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
  externalCommitSha?: string;
  externalCommitUrl?: string;
  createdAt: string;
}

export interface DeleteSummary {
  documents: number;
  versions: number;
  notes: number;
  files: number;
  docIds: string[];
}

export interface CreateProjectInput {
  userId: string;
  projectName: string;
  description?: string;
  repoFullName?: string;
  owner?: Author;
}

export interface CreateDocInput {
  projectId: string;
  userId: string;
  title: string;
  content: string;
  sourceRepo?: string;
  sourceBindings?: SourceBinding[];
}

export interface AddVersionInput {
  docId: string;
  versionNo: number;
  commitHash: string | null;
  content: string;
  message: string;
  source: VersionRec['source'];
  author?: Author;
}

export interface DataStore {
  createProject(input: CreateProjectInput): Promise<ProjectRec>;
  listProjects(userId: string): Promise<ProjectRec[]>;
  getProject(projectId: string): Promise<ProjectRec | null>;
  getOrCreateDefaultProject(userId: string, owner?: Author): Promise<ProjectRec>;
  deleteProject(projectId: string): Promise<DeleteSummary>;
  addMember(projectId: string, member: Member): Promise<ProjectRec | null>;
  removeMember(projectId: string, userId: string): Promise<ProjectRec | null>;

  createDoc(input: CreateDocInput): Promise<DocRec>;
  getDoc(docId: string): Promise<DocRec | null>;
  listDocsByUser(userId: string): Promise<DocRec[]>;
  listDocsByProject(projectId: string): Promise<DocRec[]>;
  updateDoc(docId: string, patch: Partial<Pick<DocRec, 'content' | 'title' | 'currentVersion' | 'sourceBindings' | 'generatedAt'>>): Promise<DocRec | null>;

  addVersion(input: AddVersionInput): Promise<VersionRec>;
  listVersions(docId: string): Promise<VersionRec[]>;
  getVersion(docId: string, versionNo: number): Promise<VersionRec | null>;
  setVersionExternalCommit(docId: string, versionNo: number, info: { sha: string; url: string }): Promise<void>;

  addNote(projectId: string, content: string): Promise<void>;
  addFiles(projectId: string, files: Array<{ name: string; content: string }>): Promise<void>;
}

const now = () => new Date().toISOString();

function ownerMember(owner?: Author, userId?: string): Member {
  return {
    userId: owner?.userId ?? userId ?? '',
    login: owner?.login ?? '',
    avatarUrl: owner?.avatarUrl,
    role: 'owner',
    addedAt: now(),
  };
}

/* ---- Mongoose store -------------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toStr = (v: any) => String(v);

class MongoDataStore implements DataStore {
  async createProject(input: CreateProjectInput): Promise<ProjectRec> {
    const doc = await Project.create({
      userId: input.userId,
      projectName: input.projectName,
      description: input.description ?? '',
      repoFullName: input.repoFullName,
      members: [{ ...ownerMember(input.owner, input.userId), userId: input.userId }],
    });
    return this.mapProject(doc);
  }
  async listProjects(userId: string): Promise<ProjectRec[]> {
    const docs = await Project.find({ $or: [{ userId }, { 'members.userId': userId }] }).sort({ updatedAt: -1 });
    return docs.map((d) => this.mapProject(d));
  }
  async getProject(projectId: string): Promise<ProjectRec | null> {
    const doc = await Project.findById(projectId);
    return doc ? this.mapProject(doc) : null;
  }
  async getOrCreateDefaultProject(userId: string, owner?: Author): Promise<ProjectRec> {
    const existing = await Project.findOne({ userId }).sort({ createdAt: 1 });
    return existing ? this.mapProject(existing) : this.createProject({ userId, projectName: 'My Documents', owner });
  }
  async deleteProject(projectId: string): Promise<DeleteSummary> {
    const docs = await Documentation.find({ projectId });
    const docIds = docs.map((d) => toStr(d._id));
    const versions = await DocVersion.countDocuments({ docId: { $in: docIds } });
    const notes = await DeveloperNote.countDocuments({ projectId });
    const files = await SourceCodeFile.countDocuments({ projectId });
    await DocVersion.deleteMany({ docId: { $in: docIds } });
    await Documentation.deleteMany({ projectId });
    await DeveloperNote.deleteMany({ projectId });
    await SourceCodeFile.deleteMany({ projectId });
    await Project.findByIdAndDelete(projectId);
    return { documents: docs.length, versions, notes, files, docIds };
  }
  async addMember(projectId: string, member: Member): Promise<ProjectRec | null> {
    const doc = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { members: { userId: member.userId, login: member.login, avatarUrl: member.avatarUrl, role: member.role, addedAt: new Date() } } },
      { new: true },
    );
    return doc ? this.mapProject(doc) : null;
  }
  async removeMember(projectId: string, userId: string): Promise<ProjectRec | null> {
    const doc = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { members: { userId, role: { $ne: 'owner' } } } },
      { new: true },
    );
    return doc ? this.mapProject(doc) : null;
  }
  async createDoc(input: CreateDocInput): Promise<DocRec> {
    const doc = await Documentation.create({
      projectId: input.projectId,
      title: input.title,
      content: input.content,
      currentVersion: 1,
      sourceRepo: input.sourceRepo,
      sourceBindings: input.sourceBindings ?? [],
    });
    return this.mapDoc(doc, input.userId);
  }
  async getDoc(docId: string): Promise<DocRec | null> {
    const doc = await Documentation.findById(docId);
    return doc ? this.mapDoc(doc) : null;
  }
  async listDocsByUser(userId: string): Promise<DocRec[]> {
    const projects = await Project.find({ $or: [{ userId }, { 'members.userId': userId }] });
    const projectIds = projects.map((p) => p._id);
    const docs = await Documentation.find({ projectId: { $in: projectIds } }).sort({ updatedAt: -1 });
    return docs.map((d) => this.mapDoc(d));
  }
  async listDocsByProject(projectId: string): Promise<DocRec[]> {
    const docs = await Documentation.find({ projectId }).sort({ updatedAt: -1 });
    return docs.map((d) => this.mapDoc(d));
  }
  async updateDoc(docId: string, patch: Partial<Pick<DocRec, 'content' | 'title' | 'currentVersion' | 'sourceBindings' | 'generatedAt'>>): Promise<DocRec | null> {
    const doc = await Documentation.findByIdAndUpdate(docId, patch, { new: true });
    return doc ? this.mapDoc(doc) : null;
  }
  async addVersion(input: AddVersionInput): Promise<VersionRec> {
    const doc = await DocVersion.create({
      docId: input.docId,
      versionNo: input.versionNo,
      commitHash: input.commitHash,
      content: input.content,
      message: input.message,
      source: input.source,
      authorId: input.author?.userId,
      authorLogin: input.author?.login,
      authorAvatarUrl: input.author?.avatarUrl,
    });
    return this.mapVersion(doc);
  }
  async listVersions(docId: string): Promise<VersionRec[]> {
    const docs = await DocVersion.find({ docId }).sort({ versionNo: -1 });
    return docs.map((d) => this.mapVersion(d));
  }
  async getVersion(docId: string, versionNo: number): Promise<VersionRec | null> {
    const doc = await DocVersion.findOne({ docId, versionNo });
    return doc ? this.mapVersion(doc) : null;
  }
  async setVersionExternalCommit(docId: string, versionNo: number, info: { sha: string; url: string }): Promise<void> {
    await DocVersion.updateOne({ docId, versionNo }, { externalCommitSha: info.sha, externalCommitUrl: info.url });
  }
  async addNote(projectId: string, content: string): Promise<void> {
    await DeveloperNote.create({ projectId, content });
  }
  async addFiles(projectId: string, files: Array<{ name: string; content: string }>): Promise<void> {
    await SourceCodeFile.insertMany(
      files.map((f) => ({ projectId, fileName: f.name, fileType: f.name.split('.').pop() ?? '', fileContent: f.content })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProject(d: any): ProjectRec {
    return {
      projectId: toStr(d._id),
      userId: toStr(d.userId),
      projectName: d.projectName,
      description: d.description ?? '',
      repoFullName: d.repoFullName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members: (d.members ?? []).map((m: any) => ({
        userId: toStr(m.userId),
        login: m.login ?? '',
        avatarUrl: m.avatarUrl,
        role: m.role,
        addedAt: m.addedAt?.toISOString?.() ?? now(),
      })),
      createdAt: d.createdAt?.toISOString?.() ?? now(),
      updatedAt: d.updatedAt?.toISOString?.() ?? now(),
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDoc(d: any, userId?: string): DocRec {
    return {
      docId: toStr(d._id),
      projectId: toStr(d.projectId),
      userId: userId ?? '',
      title: d.title,
      content: d.content ?? '',
      format: 'markdown',
      currentVersion: d.currentVersion ?? 1,
      sourceRepo: d.sourceRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceBindings: (d.sourceBindings ?? []).map((b: any) => ({
        repoFullName: b.repoFullName, path: b.path, branch: b.branch, commitSha: b.commitSha,
      })),
      generatedAt: d.generatedAt?.toISOString?.() ?? now(),
      createdAt: d.createdAt?.toISOString?.() ?? now(),
      updatedAt: d.updatedAt?.toISOString?.() ?? now(),
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapVersion(d: any): VersionRec {
    return {
      versionId: toStr(d._id),
      docId: toStr(d.docId),
      versionNo: d.versionNo,
      commitHash: d.commitHash ?? null,
      content: d.content,
      message: d.message ?? '',
      source: d.source ?? 'edit',
      authorId: d.authorId ? toStr(d.authorId) : undefined,
      authorLogin: d.authorLogin,
      authorAvatarUrl: d.authorAvatarUrl,
      externalCommitSha: d.externalCommitSha,
      externalCommitUrl: d.externalCommitUrl,
      createdAt: d.createdAt?.toISOString?.() ?? now(),
    };
  }
}

export const dataStore: DataStore = new MongoDataStore();
