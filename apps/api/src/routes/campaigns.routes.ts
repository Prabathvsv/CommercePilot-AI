import { Router } from 'express';
import { list, getById, create, update, approve, reject, execute, pause } from '../controllers/campaigns.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, updateCampaignSchema, campaignIdParams } from '../validators/campaign.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', validate({ body: createCampaignSchema }), create);
router.get('/:id', validate({ params: campaignIdParams }), getById);
router.patch('/:id', validate({ params: campaignIdParams, body: updateCampaignSchema }), update);
router.post('/:id/approve', validate({ params: campaignIdParams }), approve);
router.post('/:id/reject', validate({ params: campaignIdParams }), reject);
router.post('/:id/execute', validate({ params: campaignIdParams }), execute);
router.post('/:id/pause', validate({ params: campaignIdParams }), pause);

export default router;
