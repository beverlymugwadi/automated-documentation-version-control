import { User } from '../models/User';

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
  findByGithubId(githubId: string): Promise<StoredUser | null>;
  create(input: CreateUserInput): Promise<StoredUser>;
  linkGithub(userId: string, link: GithubLink): Promise<StoredUser | null>;
  unlinkGithub(userId: string): Promise<StoredUser | null>;
  getEncryptedGithubToken(userId: string): Promise<string | null>;
  deleteById(userId: string): Promise<void>;
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

  async findByGithubId(githubId: string): Promise<StoredUser | null> {
    const doc = await User.findOne({ githubId });
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

  async unlinkGithub(userId: string): Promise<StoredUser | null> {
    const doc = await User.findByIdAndUpdate(
      userId,
      { $unset: { githubId: 1, githubLogin: 1, githubAccessToken: 1, avatarUrl: 1 } },
      { new: true },
    );
    return doc ? this.map(doc) : null;
  }

  async getEncryptedGithubToken(userId: string): Promise<string | null> {
    const doc = await User.findById(userId).select('+githubAccessToken');
    return (doc?.githubAccessToken as string | undefined) ?? null;
  }

  async deleteById(userId: string): Promise<void> {
    await User.findByIdAndDelete(userId);
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

export const userStore: UserStore = new MongoUserStore();
