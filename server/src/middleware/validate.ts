import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { HttpError } from './errorHandler';

export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as ZodInfer<S>;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_';
          if (!fields[key]) fields[key] = issue.message;
        }
        next(new HttpError(400, 'Validation failed', fields));
        return;
      }
      next(err);
    }
  };
}