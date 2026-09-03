import { Router } from 'express';
import { list, getById, segments, atRisk, highValue } from '../controllers/customers.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.get('/segments', segments);
router.get('/at-risk', atRisk);
router.get('/high-value', highValue);
router.get('/:id', getById);

export default router;
