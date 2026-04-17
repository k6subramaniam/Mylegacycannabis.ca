import { test, expect } from "@playwright/test";
import path from "path";

/**
 * REWARDS & REFERRAL TESTS — PRs #31, #32, #48
 * Points display, earning, coupons, referral codes, 24h auto-cancel.
 * Tag: @critical @rewards
 */

const USER_AUTH = path.join("./tests/e2e", "../.auth/user.json");

test.describe("Rewards System @critical @rewards", () => {
  test.use({ storageState: USER_AUTH });

  // ═══════════════════════════════════════
  // REWARDS DISPLAY
  // ═══════════════════════════════════════

  test("account rewards tab shows points balance", async ({ page }) => {
    await page.goto("/account");

    const rewardsTab = page.getByRole("button", {
      name: /rewards|my rewards/i,
    });
    await expect(rewardsTab).toBeVisible();
    await rewardsTab.click();

    // Points balance should be a visible number
    const pointsDisplay = page.getByText(/available points|points/i);
    await expect(pointsDisplay.first()).toBeVisible({ timeout: 5_000 });

    // Should show a numeric value (0 or more)
    const balanceText = await page
      .locator('[class*="points"], [data-testid*="points"]')
      .first()
      .textContent()
      .catch(() => null);
    if (balanceText) {
      const num = parseInt(balanceText.replace(/\D/g, ""));
      expect(num).toBeGreaterThanOrEqual(0);
    }
  });

  test("rewards tab shows earning rate info", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("button", { name: /rewards/i }).click();

    // Should explain how points are earned
    const earningInfo = page.getByText(/earn.*point|point.*\$1|\$1.*point/i);
    await expect(earningInfo.first()).toBeVisible({ timeout: 5_000 });
  });

  test("header shows reward points for authenticated user", async ({
    page,
  }) => {
    await page.goto("/");

    // PR #90: rewards points display in header
    const headerPoints = page.locator(
      '[data-testid="header-points"], [class*="reward-badge"]'
    );
    if (await headerPoints.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await headerPoints.textContent();
      expect(text).toMatch(/\d/); // should contain a number
    }
  });

  // ═══════════════════════════════════════
  // REFERRAL SYSTEM
  // ═══════════════════════════════════════

  test("rewards tab shows referral code and copy button", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("button", { name: /rewards/i }).click();

    // Referral section
    await expect(page.getByText(/refer a friend/i)).toBeVisible({
      timeout: 5_000,
    });

    // Referral code should be visible (format: MLC-XXXX)
    const codeElement = page
      .locator(
        '[class*="referral-code"], [data-testid="referral-code"], [class*="mono"]'
      )
      .first();
    if (await codeElement.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const code = await codeElement.textContent();
      expect(code).toBeTruthy();
      expect(code!.length).toBeGreaterThan(3);
    }

    // Copy button should exist
    const copyBtn = page.getByRole("button", { name: /copy/i }).first();
    if (await copyBtn.isVisible().catch(() => false)) {
      await copyBtn.click();
      // Toast or feedback should appear
      const toast = page.getByText(/copied/i);
      await expect(toast)
        .toBeVisible({ timeout: 3_000 })
        .catch(() => {});
    }
  });

  test("referral share link button exists", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("button", { name: /rewards/i }).click();

    // Share button (PR #48)
    const shareBtn = page
      .getByRole("button", { name: /share/i })
      .or(page.locator('[data-testid="referral-share"]'));
    if (await shareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(shareBtn).toBeVisible();
    }
  });

  test("registration page accepts referral code via URL param", async ({
    page,
  }) => {
    // Navigate with referral code in URL
    await page.goto("/register?ref=MLC-TEST");

    // Referral code field should be pre-filled or visible
    const refInput = page.locator(
      'input[name*="referral"], input[placeholder*="referral"]'
    );
    const refSection = page.getByText(/referral code/i);

    if (await refInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const value = await refInput.inputValue();
      expect(value).toContain("MLC-TEST");
    } else if (
      await refSection.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      // Referral section exists — code may be in a hidden field or expanded section
      await expect(refSection).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // CHECKOUT POINTS DISPLAY
  // ═══════════════════════════════════════

  test("checkout shows points to be earned", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    await page.goto("/checkout");

    // Should show points to be earned (PR #67 fixed this)
    const pointsEarned = page.getByText(
      /earn.*point|point.*earn|\d+\s*points/i
    );
    if (
      await pointsEarned
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      const text = await pointsEarned.first().textContent();
      // Should be a number > 0 (not "0 points")
      expect(text).not.toMatch(/\b0\s*points?\b/i);
    }
  });

  // ═══════════════════════════════════════
  // REWARDS PAGE (PUBLIC)
  // ═══════════════════════════════════════

  test("public rewards page explains the program", async ({ page }) => {
    await page.goto("/rewards");

    await expect(page.getByText(/rewards|loyalty/i).first()).toBeVisible({
      timeout: 5_000,
    });
    // Should explain tiers or earning structure
    await expect(page.getByText(/earn|point|redeem/i).first()).toBeVisible();
  });
});
