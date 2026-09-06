import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// The .env lives at the monorepo root. Resolve it explicitly because
// `npm run dev --workspace=apps/api` runs with cwd = apps/api, where dotenv's
// default (cwd-relative) lookup would miss it.
//
// Guard the import.meta.url lookup: Vercel's serverless builder compiles the
// entry to CommonJS, where import.meta.url is empty (and there is no .env on
// the platform anyway), so we fall back to dotenv's cwd lookup.
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
} catch {
  // bundled CommonJS runtime (e.g. Vercel) — no usable module URL
}
dotenv.config(); // fallback: a .env in the process cwd wins if present

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional().default('http://localhost:11434'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // In dev, provide sensible defaults so the app can start for inspection
  if (process.env.NODE_ENV !== 'production') {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/commercepilot?schema=public';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod';
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  PORT: Number(process.env.PORT ?? 5000),
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
};
