import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.test" });

/**
 * My Legacy Cannabis — Playwright Configuration
 *
 * Usage:
 *   npx playwright test                    # run all tests locally
 *   npx playwright test --project=chrome   # desktop only
 *   npx playwright test --project=mobile   # mobile only
 *   npx playwright test --grep @smoke      # smoke tests only
 *   npx playwright test --grep @critical   # critical path only
 *   npx playwright test --ui               # interactive UI mode
 *   npx playwright show-report             # view HTML report
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  workers: process.env.CI ? 2 : undefined,

  // Fail the build if any test.only is left in code
  forbidOnly: !!process.env.CI,

  // Report
  reporter: [
    ["html", { open: process.env.CI ? "never" : "on-failure" }],
    ["list"],
    // JSON report for CI parsing
    ...(process.env.CI
      ? [["json", { outputFile: "test-results/results.json" }] as any]
      : []),
  ],

  // Shared settings for all projects
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5000",

    // Capture evidence on failure
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "on-first-retry",

    // Reasonable timeouts for Railway
    actionTimeout: 15_000,
    navigationTimeout: 20_000,

    // Accept cookies / age gate automatically
    extraHTTPHeaders: {
      "Accept-Language": "en-CA",
    },
  },

  projects: [
    // ─── Auth Setup (runs first) ───
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ─── Desktop Chrome ───
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      dependencies: ["auth-setup"],
    },

    // ─── Mobile (Galaxy S25 Ultra — your primary device) ───
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        // Galaxy S25 Ultra approximate viewport
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ["auth-setup"],
    },

    // ─── Smoke tests against production ───
    {
      name: "production-smoke",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://mylegacycannabisca-production.up.railway.app",
      },
      testMatch: /.*\.smoke\.spec\.ts/,
      // No auth dependency — smoke tests are unauthenticated
    },
  ],

  // Auto-start dev server for local testing
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
