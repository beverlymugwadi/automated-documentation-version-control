import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';

interface FeedbackEntry {
  docId: string;
  userId: string;
  rating: number;
  comment?: string;
  at: string;
}

const feedback: FeedbackEntry[] = [];

export const feedbackSchema = z.object({
  docId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { docId, rating, comment } = req.body as z.infer<typeof feedbackSchema>;
  feedback.push({ docId, userId: req.user!.userId, rating, comment, at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

export const feedbackSummary = asyncHandler(async (_req: Request, res: Response) => {
  const count = feedback.length;
  const average = count ? feedback.reduce((s, f) => s + f.rating, 0) / count : 0;
  res.json({ count, average: Number(average.toFixed(2)) });
});