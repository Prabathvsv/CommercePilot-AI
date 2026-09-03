import { Router } from 'express';
import { list, metrics, trends, anomalies } from '../controllers/transactions.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.get('/metrics', metrics);
router.get('/trends', trends);
router.get('/anomalies', anomalies);

export default router;
