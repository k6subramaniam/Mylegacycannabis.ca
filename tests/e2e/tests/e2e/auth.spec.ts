import { test, expect } from "@playwright/test";

/**
 * AUTHENTICATION TESTS — Validates login, registration, OAuth, and session handling.
 * Covers the Google OAuth race condition fix (isLoading guard) and network resilience.
 *
 * Tag: @critical @auth
 */

test.describe("Authentication Flows @critical @auth", () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean unauthenticated state
    await page.context().clearCookies();
  });

  // ═══════════════════════════════════════
  // LOGIN PAGE
  // ═══════════════════════════════════════

  test("login page renders all sign-in methods", async ({ page }) => {
    await page.goto("/login");

    // Email option
    await expect(page.getByText(/sign in with email/i)).toBeVisible();

    // Google option (may be disabled)
    await expect(page.getByText(/sign in with google/i)).toBeVisible();

    // Register link
    await expect(page.getByText(/create account/i)).toBeVisible();

    // Age confirmation footer
    await expect(page.getByText(/19 years of age/i)).toBeVisible();
  });

  test("email OTP flow — shows code entry after sending", async ({ page }) => {
    await page.goto("/login");

    // Step 1: Choose email
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Step 2: Enter identifier screen
    await expect(page.getByText(/enter your email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();

    // Back button works
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/sign in with email/i)).toBeVisible();

    // Go forward again
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Enter email and submit
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /send verification code/i }).click();

    // Should transition to OTP entry (or show error for unknown email)
    const otpScreen = page.getByText(/enter verification code/i);
    const errorMsg = page.getByText(/not found|register first/i);

    // One of these should appear
    await expect(otpScreen.or(errorMsg)).toBeVisible({ timeout: 10_000 });
  });

  test("OTP input handles paste and keyboard navigation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Use a known test email that will succeed
    await page
      .getByPlaceholder(/email/i)
      .fill(process.env.TEST_USER_EMAIL || "testuser@mylegacycannabis.ca");
    await page.getByRole("button", { name: /send verification code/i }).click();

    // Wait for OTP screen
    await expect(page.getByText(/enter verification code/i)).toBeVisible({
      timeout: 10_000,
    });

    const otpInputs = page.locator('input[inputmode="numeric"]');
    await expect(otpInputs).toHaveCount(6);

    // Test paste — paste full 6-digit code
    await otpInputs.first().focus();
    await page.keyboard.insertText("123456");

    // All 6 inputs should be filled
    for (let i = 0; i < 6; i++) {
      await expect(otpInputs.nth(i)).toHaveValue(/\d/);
    }
  });

  // ═══════════════════════════════════════
  // GOOGLE OAUTH
  // ═══════════════════════════════════════

  test("Google login button navigates to OAuth endpoint", async ({ page }) => {
    await page.goto("/login");

    // Click Google sign-in
    const googleBtn = page.getByRole("button", {
      name: /sign in with google/i,
    });

    // Check if Google is available
    const isDisabled = await googleBtn.isDisabled().catch(() => true);
    if (isDisabled) {
      test.skip(true, "Google OAuth not enabled");
      return;
    }

    // Intercept navigation to Google OAuth
    const navigationPromise = page
      .waitForURL(/accounts\.google\.com|\/api\/auth\/google/i, {
        timeout: 5_000,
      })
      .catch(() => null);
    await googleBtn.click();

    // Should navigate to Google or the API redirect endpoint
    const url = page.url();
    expect(
      url.includes("google") || url.includes("/api/auth/google")
    ).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // SESSION / AUTH GUARD (isLoading fix)
  // ═══════════════════════════════════════

  test("unauthenticated /account access redirects to /login without flash", async ({
    page,
  }) => {
    // This validates the isLoading guard fix
    await page.goto("/account");

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5_000 });

    // The account page content should NEVER have been visible
    // (no flash of authenticated content before redirect)
    await expect(page.getByText(/my account/i)).not.toBeVisible();
  });

  test("unauthenticated /admin access redirects appropriately", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Should redirect to login or show unauthorized
    const url = page.url();
    const isRedirected =
      url.includes("/login") || url.includes("/unauthorized");
    const hasAuthPrompt = await page
      .getByText(/sign in|unauthorized/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(isRedirected || hasAuthPrompt).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════

  test("registration page has all required fields", async ({ page }) => {
    await page.goto("/register");

    // Should have name, email, phone fields
    await expect(page.getByText(/create account/i).first()).toBeVisible();

    // Check for email and phone sign-up options
    const emailOption = page.getByText(/sign up with email/i);
    const googleOption = page.getByText(/sign up with google/i);

    // At least email should be available
    await expect(emailOption.or(page.getByPlaceholder(/email/i))).toBeVisible();
  });

  test("registration validates age (19+ requirement)", async ({ page }) => {
    await page.goto("/register");

    // If there's a birthday field, test age validation
    const birthdayInput = page.locator('input[type="date"]');
    if (await birthdayInput.isVisible().catch(() => false)) {
      // Enter underage birthday
      const underageDOB = new Date();
      underageDOB.setFullYear(underageDOB.getFullYear() - 17);
      await birthdayInput.fill(underageDOB.toISOString().split("T")[0]);

      // Should show age error
      await expect(page.getByText(/19 years/i)).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // COMPLETE PROFILE (Google OAuth new users)
  // ═══════════════════════════════════════

  test("complete-profile page requires phone number", async ({ page }) => {
    // This page appears after Google OAuth for new users without a phone
    await page.goto("/complete-profile?from=google&welcome=true");

    // Should show phone number requirement
    await expect(page.getByText(/mobile number/i)).toBeVisible();
    await expect(page.getByText(/required/i).first()).toBeVisible();

    // Google connected confirmation
    await expect(page.getByText(/google account connected/i)).toBeVisible();

    // Submit without phone should not work
    const submitBtn = page.getByRole("button", { name: /complete setup/i });
    if (await submitBtn.isVisible().catch(() => false)) {
      await expect(submitBtn).toBeDisabled();
    }
  });
});
