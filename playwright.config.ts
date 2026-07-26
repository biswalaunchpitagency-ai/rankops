import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: "./e2e/test-results",
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run --cwd server --env-file=.env.test src/index.ts",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: "test",
      },
    },
    {
      command: "bun run --cwd client vite --port 5174 --host 127.0.0.1",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: "test",
        VITE_API_URL: "http://127.0.0.1:3001",
      },
    },
  ],
});
