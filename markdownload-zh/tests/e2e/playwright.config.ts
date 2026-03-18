import { defineConfig } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  retries: 1,
  workers: 1, // 扩展测试需要串行执行

  use: {
    // 使用持久化上下文以支持扩展
    launchOptions: {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        channel: undefined, // 使用 Playwright 的 Chromium
      },
    },
  ],

  reporter: [['list'], ['html', { open: 'never' }]],

  outputDir: './test-results',
});
