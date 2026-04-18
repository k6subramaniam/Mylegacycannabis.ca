import { test as setup, expect } from "@playwright/test";
import path from "path";

const USER_AUTH_FILE = path.join("./tests/e2e", "../.auth/user.json");
const ADMIN_AUTH_FILE = path.join("./tests/e2e", "../.auth/admin.json");

/**
 * Authenticate as a regular user and save session state.
 * Other tests reuse this via: test.use({ storageState: 'tests/.auth/user.json' })
 *
 * NOTE: Adjust credentials to match your test account.
 * In production, create a dedicated test user that won't interfere with real data.
 */
setup.skip("authenticate as user", async ({ page }) => {
  // Navigate to login
  await page.goto("/login");

  // Select email sign-in
  await page.getByRole("button", { name: /sign in with email/i }).click();

  // Enter test user email
  await page
    .getByPlaceholder(/email/i)
    .fill(process.env.TEST_USER_EMAIL || "testuser@mylegacycannabis.ca");
  await page.getByRole("button", { name: /send verification code/i }).click();

  // Wait for OTP screen
  await expect(page.getByText(/enter verification code/i)).toBeVisible({
    timeout: 10_000,
  });

  // In test environment, use a known OTP or bypass
  // Option A: If you have a test OTP endpoint
  if (process.env.TEST_OTP_BYPASS === "true") {
    // Call your API directly to get the OTP for the test user
    const otpResponse = await page.request.post("/api/auth/test-otp", {
      data: {
        email: process.env.TEST_USER_EMAIL || "testuser@mylegacycannabis.ca",
      },
    });
    const { code } = await otpResponse.json();

    // Fill OTP
    const otpInputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(code[i]);
    }
  } else {
    // Option B: Use a fixed test OTP (set in your server for test env)
    const testCode = process.env.TEST_USER_OTP || "123456";
    const otpInputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(testCode[i]);
    }
  }

  // Click verify
  await page.getByRole("button", { name: /verify/i }).click();

  // Should land on account page
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  await expect(page.getByText(/my account/i)).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: USER_AUTH_FILE });
});

/**
 * Authenticate as admin and save session state.
 */
setup.skip("authenticate as admin", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: /sign in with email/i }).click();
  await page
    .getByPlaceholder(/email/i)
    .fill(process.env.TEST_ADMIN_EMAIL || "admin@mylegacycannabis.ca");
  await page.getByRole("button", { name: /send verification code/i }).click();

  await expect(page.getByText(/enter verification code/i)).toBeVisible({
    timeout: 10_000,
  });

  const testCode = process.env.TEST_ADMIN_OTP || "654321";
  const otpInputs = page.locator('input[inputmode="numeric"]');
  for (let i = 0; i < 6; i++) {
    await otpInputs.nth(i).fill(testCode[i]);
  }

  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });

  // Navigate to admin to confirm admin access
  await page.goto("/admin");
  await expect(page.locator("text=Admin").first()).toBeVisible({
    timeout: 5_000,
  });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
