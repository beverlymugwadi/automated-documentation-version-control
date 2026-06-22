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
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}