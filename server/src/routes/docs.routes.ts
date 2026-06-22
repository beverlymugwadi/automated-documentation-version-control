import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import {
  listDocs,
  getDoc,
  createVersion,
  listVersions,
  getVersion,
  getDiff,
  rollbackVersion,
  drift,
  simulate,
  regenerate,
  schemas,
} from '../controllers/docs.controller';
import { exportDoc } from '../controllers/export.controller';
import { commitToGithub, schemas as commitSchemas } from '../controllers/githubCommit.controller';

const router = Router();
router.use(requireAuth);

router.get('/', listDocs);
router.get('/:docId', getDoc);
router.post('/:docId/versions', validateBody(schemas.saveSchema), createVersion);
router.get('/:docId/versions', listVersions);
router.get('/:docId/versions/:versionNo', getVersion);
router.get('/:docId/diff', getDiff);
router.post('/:docId/rollback', validateBody(schemas.rollbackSchema), rollbackVersion);
router.get('/:docId/export', exportDoc);

router.get('/:docId/drift', drift);
router.post('/:docId/simulate-drift', simulate);
router.post('/:docId/regenerate', regenerate);

router.post('/:docId/commit-to-github', validateBody(commitSchemas.commitSchema), commitToGithub);

export default router;