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
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // http://client:3000 isn't a secure context by default, so OPFS and
          // SharedArrayBuffer are disabled. Flag teaches Chromium to treat the
          // compose-internal origin as secure for E2E only. Real browsers
          // visiting production (over https) don't need this.
          args: ['--unsafely-treat-insecure-origin-as-secure=http://client:3000'],
        },
      },
    },
  ],
});
