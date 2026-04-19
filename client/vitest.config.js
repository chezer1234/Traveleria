import { defineConfig } from 'vitest/config';

// Vitest config: Jest-compatible globals so the points parity test mirrors the
// server's Jest test 1:1 (only the import path differs).
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.js'],
  },
});
