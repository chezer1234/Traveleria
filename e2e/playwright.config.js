// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Backstop so a wedged test or stack can never hang the whole job. The CI job
  // also carries timeout-minutes, but this fails the run with a clear Playwright
  // message first. Generous next to the ~12s the suite actually takes.
  globalTimeout: 8 * 60 * 1000,
  // 'list' prints one clean line per test as it starts and finishes — readable
  // in CI logs, unlike 'line' which rewrites a single line with cursor escapes
  // (the `[1A[2K` noise that shows up in CI). 'github' adds failure annotations.
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Playwright runs on the host and points at localhost — Chromium already
      // treats localhost as a secure context, so OPFS and COOP/COEP Just Work.
      // No --unsafely-treat-insecure-origin-as-secure needed.
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      // Playwright's Linux WebKit ships WITHOUT the File System API (no
      // navigator.storage.getDirectory — verified, and see
      // cypress-io/cypress#30270), so it behaves exactly like iOS Safari in
      // Private Browsing: OPFS unavailable. That makes it useless for the
      // OPFS happy path but a deterministic rig for the "app must still load
      // when OPFS is missing" regression (the iOS Safari infinite-spinner
      // bug). Only the loading-resilience spec runs here; the rest of the
      // suite asserts OPFS-specific behaviour and stays chromium-only.
      testMatch: /loading-resilience\.spec\.js/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
