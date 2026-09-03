import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../apps/api/src/server.js';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-expect-error — Express app is compatible with Vercel's handler signature
  return app(req, res);
}
