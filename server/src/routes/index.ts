import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import githubRoutes from './github.routes';
import generateRoutes from './generate.routes';
import docsRoutes from './docs.routes';
import projectsRoutes from './projects.routes';
import feedbackRoutes from './feedback.routes';
import webhooksRoutes from './webhooks.routes';

const api = Router();

api.use('/health', healthRoutes);
api.use('/auth', authRoutes);
api.use('/github', githubRoutes);
api.use('/generate', generateRoutes);
api.use('/docs', docsRoutes);
api.use('/projects', projectsRoutes);
api.use('/feedback', feedbackRoutes);
api.use('/webhooks', webhooksRoutes);

export default api;