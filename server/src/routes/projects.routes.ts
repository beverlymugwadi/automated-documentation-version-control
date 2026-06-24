import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import {
  createProject,
  listProjects,
  getProject,
  deleteProject,
  listMembers,
  addMember,
  removeMember,
  schemas,
} from '../controllers/projects.controller';

const router = Router();
router.use(requireAuth);

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:projectId', getProject);
router.delete('/:projectId', deleteProject);

router.get('/:projectId/members', listMembers);
router.post('/:projectId/members', validateBody(schemas.addMemberSchema), addMember);
router.delete('/:projectId/members/:userId', removeMember);

export default router;