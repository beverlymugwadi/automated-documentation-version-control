import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { User } from '../models/User';
import { shortHash } from './crypto';

export interface StoredUser {
  userId: string;
  fullName: string;
  email: string;
  passwordHash?: string;
  githubId?: string;
  githubLogin?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface PublicUser {
  userId: string;
  fullName: string;
  email: string;
  githubLogin?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export function toPublicUser(u: StoredUser): PublicUser {
  return {
    userId: u.userId,
    fullName: u.fullName,
    email: u.email,
    githubLogin: u.githubLogin,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  };
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
}

export interface GithubLink {
  githubId: string;
  githubLogin: string;
  avatarUrl?: string;
  encryptedToken: string;
}

export interface UserStore {
  findByEmail(email: string): Promise<StoredUser | null>;
  findByLogin(login: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  create(input: CreateUserInput): Promise<StoredUser>;
  linkGithub(userId: string, link: GithubLink): Promise<StoredUser | null>;
  getEncryptedGithubToken(userId: string): Promise<string | null>;
}

class MemoryUserStore implements UserStore {
  private users: StoredUser[] = [];
  private tokens = new Map<string, string>();

  constructor() {
    this.users.push({
      userId: 'u_demo',
      fullName: 'Ada Lovelace',
      email: 'ada@adgvc.dev',
      passwordHash: bcrypt.hashSync('password123', 10),
      createdAt: new Date(),
    });
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    return this.users.find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async findByLogin(login: string): Promise<StoredUser | null> {
    return this.users.find(
      (u) => u.githubLogin?.toLowerCase() === login.toLowerCase(),
    ) ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    return this.users.find((u) => u.userId === id) ?? null;
  }

  async create(input: CreateUserInput): Promise<StoredUser> {
    const user: StoredUser = {
      userId: `u_${shortHash(input.email + Date.now())}`,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async linkGithub(userId: string, link: GithubLink): Promise<StoredUser | null> {
    const user = this.users.find((u) => u.userId === userId);
    if (!user) return null;
    user.githubId = link.githubId;
    user.githubLogin = link.githubLogin;
    user.avatarUrl = link.avatarUrl ?? user.avatarUrl;
    this.tokens.set(userId, link.encryptedToken);
    return user;
  }

  async getEncryptedGithubToken(userId: string): Promise<string | null> {
    return this.tokens.get(userId) ?? null;
  }
}

class MongoUserStore implements UserStore {
  async findByEmail(email: string): Promise<StoredUser | null> {
    const doc = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    return doc ? this.map(doc) : null;
  }

  async findByLogin(login: string): Promise<StoredUser | null> {
    const doc = await User.findOne({ githubLogin: login });
    return doc ? this.map(doc) : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const doc = await User.findById(id);
    return doc ? this.map(doc) : null;
  }

  async create(input: CreateUserInput): Promise<StoredUser> {
    const doc = await User.create({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
    });
    return this.map(doc);
  }

  async linkGithub(userId: string, link: GithubLink): Promise<StoredUser | null> {
    const doc = await User.findByIdAndUpdate(
      userId,
      {
        githubId: link.githubId,
        githubLogin: link.githubLogin,
        avatarUrl: link.avatarUrl,
        githubAccessToken: link.encryptedToken,
      },
      { new: true },
    );
    return doc ? this.map(doc) : null;
  }

  async getEncryptedGithubToken(userId: string): Promise<string | null> {
    const doc = await User.findById(userId).select('+githubAccessToken');
    return (doc?.githubAccessToken as string | undefined) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map(doc: any): StoredUser {
    return {
      userId: String(doc._id),
      fullName: doc.fullName,
      email: doc.email,
      passwordHash: doc.passwordHash,
      githubId: doc.githubId,
      githubLogin: doc.githubLogin,
      avatarUrl: doc.avatarUrl,
      createdAt: doc.createdAt,
    };
  }
}

export const userStore: UserStore = env.mockMode
  ? new MemoryUserStore()
  : new MongoUserStore();