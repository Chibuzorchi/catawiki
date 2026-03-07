import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

if (process.argv.some(arg => arg.startsWith('--project'))) {
  process.env['_PW_ALL_PROJECTS'] = '1';
}
const allProjectsEnabled = process.env['_PW_ALL_PROJECTS'] === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  grepInvert: process.env['CI'] ? /@flaky/ : undefined,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],

  use: {
    baseURL: process.env['BASE_URL'] || 'https://www.catawiki.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'en-GB',
    timezoneId: 'Europe/Amsterdam',
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  },

  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ].filter(p => allProjectsEnabled || p.name === 'firefox'),

  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
});
