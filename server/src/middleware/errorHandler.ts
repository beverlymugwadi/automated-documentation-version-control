import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class HttpError extends Error {
  statusCode: number;
  details?: Record<string, string>;
  constructor(statusCode: number, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  const details = err instanceof HttpError ? err.details : undefined;

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { fields: details } : {}),
      ...(env.isProd || !(err instanceof Error) ? {} : { stack: err.stack }),
    },
  });
}