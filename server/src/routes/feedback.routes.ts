import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { submitFeedback, feedbackSummary, feedbackSchema } from '../controllers/feedback.controller';

const router = Router();
router.use(requireAuth);
router.post('/', validateBody(feedbackSchema), submitFeedback);
router.get('/summary', feedbackSummary);
export default router;