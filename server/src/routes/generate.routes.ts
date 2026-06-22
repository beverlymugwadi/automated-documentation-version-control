import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { generate, generateSchema } from '../controllers/generate.controller';

const router = Router();
router.post('/', requireAuth, validateBody(generateSchema), generate);
export default router;