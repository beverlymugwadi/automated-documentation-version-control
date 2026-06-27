import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import api from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.clientUrl,
    credentials: true,
    // Explicitly allow Authorization so CORS preflight passes when the frontend
    // sends a Bearer token in the Authorization header (required for cross-origin
    // requests — without this the browser blocks the request before it arrives).
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}