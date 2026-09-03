import { Router } from 'express';
import { chat, analyzeBusiness, generateCampaign, estimateRoi } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { chatSchema, generateCampaignSchema, estimateRoiSchema } from '../validators/ai.validators.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAuth, aiLimiter);

router.post('/chat', validate({ body: chatSchema }), chat);
router.post('/analyze-business', analyzeBusiness);
router.post('/generate-campaign', validate({ body: generateCampaignSchema }), generateCampaign);
router.post('/estimate-roi', validate({ body: estimateRoiSchema }), estimateRoi);

export default router;
