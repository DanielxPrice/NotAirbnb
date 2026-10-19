const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node e2e/start.js',
    url: 'http://localhost:4173/api/health',
    reuseExistingServer: false,
    timeout: 120000
  }
});
