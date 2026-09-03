import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../apps/api/src/server.js';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
