import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI ?? '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';
const githubConfigured = Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: PORT,

  mongoUri: MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',

  github: {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ??
      'http://localhost:4000/api/auth/github/callback',
    scope: process.env.GITHUB_SCOPE ?? 'user:email,read:user,public_repo',
  },

  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
  llmAvailable: Boolean(process.env.OPENAI_API_KEY),

  githubConfigured,
} as const;

export type Env = typeof env;