import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@commercepilot/agents': path.resolve(__dirname, 'packages/agents/src/index.ts'),
      '@commercepilot/ai': path.resolve(__dirname, 'packages/ai/src/index.ts'),
      '@commercepilot/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@commercepilot/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
    },
  },
});
