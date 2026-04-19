// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['line'],
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
  ],
});
