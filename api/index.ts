import type { VercelRequest, VercelResponse } from '@vercel/node';

// server.js is an ES Module; the Vercel serverless wrapper compiles to CJS,
// so we must load it via dynamic import() rather than require().
let appPromise: Promise<import('express').Express> | null = null;
async function getApp() {
  if (!appPromise) {
    appPromise = import('../apps/api/src/server.js').then((m) => m.createApp());
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  return app(req as any, res as any);
}
