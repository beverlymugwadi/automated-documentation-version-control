import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { repos, tree, file } from '../controllers/github.controller';

const router = Router();

router.use(requireAuth);
router.get('/repos', repos);
router.get('/repos/:owner/:repo/tree', tree);
router.get('/repos/:owner/:repo/file', file);

export default router;