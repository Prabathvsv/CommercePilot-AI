import { Router } from 'express';
import { list, getById, analyze, recommend } from '../controllers/opportunities.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { campaignIdParams } from '../validators/campaign.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/analyze', analyze);
router.get('/:id', validate({ params: campaignIdParams }), getById);
router.post('/:id/recommend', validate({ params: campaignIdParams }), recommend);

export default router;
