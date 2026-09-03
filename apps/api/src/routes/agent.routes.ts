import { Router } from 'express';
import { run, listRuns, getRun, getRunTools } from '../controllers/agent.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { runAgentSchema } from '../validators/agent.validators.js';

const router = Router();

router.use(requireAuth);

router.post('/run', validate({ body: runAgentSchema }), run);
router.get('/runs', listRuns);
router.get('/runs/:id', getRun);
router.get('/runs/:id/tools', getRunTools);

export default router;
