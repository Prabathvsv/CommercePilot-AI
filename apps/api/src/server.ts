import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import customerRoutes from './routes/customers.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import opportunityRoutes from './routes/opportunities.routes.js';
import campaignRoutes from './routes/campaigns.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import aiRoutes from './routes/ai.routes.js';
import agentRoutes from './routes/agent.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & parsing
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/opportunities', opportunityRoutes);
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/agent', agentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Start server only when run directly (not when imported for tests).
// Guard import.meta: under the Vercel CJS bundle import.meta.url is empty.
const isMain =
  !!process.argv[1] &&
  !!import.meta.url &&
  import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');

if (isMain) {
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`🚀 CommercePilot API listening on http://localhost:${env.PORT}`);
    logger.info(`   AI provider: ${env.GEMINI_API_KEY ? 'gemini' : 'deterministic (offline)'}`);
  });
}
