// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    // Point this at your local or deployed StableMate URL
    baseURL: process.env.STABLEMATE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: process.env.STABLEMATE_URL ? undefined : {
    command: 'python3 -m http.server 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 5000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
