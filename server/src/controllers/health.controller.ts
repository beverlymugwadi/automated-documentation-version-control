import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { env } from '../config/env';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'adgvc-api',
    mockMode: env.mockMode,
    mockReason: env.mockReason,
    githubConfigured: env.githubConfigured,
    llmAvailable: env.llmAvailable,
    timestamp: new Date().toISOString(),
  });
});