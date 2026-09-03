// Lightweight logger shared within the agents package.
/* eslint-disable no-console */
export const logger = {
  info: (msg: string, meta?: unknown): void => {
    console.info(`[${new Date().toISOString()}] INFO: ${msg}`, meta ?? '');
  },
  error: (msg: string, meta?: unknown): void => {
    console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: unknown): void => {
    console.warn(`[${new Date().toISOString()}] WARN: ${msg}`, meta ?? '');
  },
};
