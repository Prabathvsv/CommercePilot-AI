import { Router } from 'express';
import { overview, revenue, customers, opportunities } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', overview);
router.get('/revenue', revenue);
router.get('/customers', customers);
router.get('/opportunities', opportunities);

export default router;
