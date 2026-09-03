import { Router } from 'express';
import { campaigns, revenue, roi, predictions } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/campaigns', campaigns);
router.get('/revenue', revenue);
router.get('/roi', roi);
router.get('/predictions', predictions);

export default router;
