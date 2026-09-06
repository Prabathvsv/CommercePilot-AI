import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../apps/api/dist/server.bundle.cjs';

// The API server is pre-bundled by `esbuild` (see vercel.json buildCommand) into a
// single CommonJS file. We import it *statically* here: Vercel's file tracer only
// follows static imports from this entrypoint — a dynamic import() of either the
// .ts source or dist/server.js is silently dropped, leaving the lambda with no
// server in it (FUNCTION_INVOCATION_FAILED on every request). The bundle is CJS,
// so the builder's require() interop cannot hit ERR_REQUIRE_ESM.

let app: import('express').Express | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) app = createApp();
  return app(req as any, res as any);
}