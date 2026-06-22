import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';

export const githubWebhook = asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    error: {
      code: 'WEBHOOK_NOT_CONFIGURED',
      message:
        'GitHub webhooks are not enabled in this deployment. Drift is detected via polling ' +
        '(document load + "Check for updates"). Webhooks require a public server URL.',
    },
  });
});