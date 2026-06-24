import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import {
  register,
  login,
  logout,
  me,
  deleteAccount,
  registerSchema,
  loginSchema,
} from '../controllers/auth.controller';
import { githubStart, githubCallback, githubDisconnect } from '../controllers/githubAuth.controller';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteAccount);

// GitHub OAuth web flow
router.get('/github', githubStart);
router.get('/github/callback', githubCallback);
router.delete('/github', requireAuth, githubDisconnect);

export default router;
