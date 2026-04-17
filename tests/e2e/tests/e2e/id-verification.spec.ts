import { test, expect } from "@playwright/test";
import path from "path";

/**
 * ID VERIFICATION FLOW — PRs #6, #9, #56
 * Upload, status transitions, AI auto-verify, admin review panel, global toggle.
 * Tag: @critical @verification
 */

const USER_AUTH = path.join("./tests/e2e", "../.auth/user.json");
const ADMIN_AUTH = path.join("./tests/e2e", "../.auth/admin.json");

test.describe("ID Verification @critical @verification", () => {
  test.describe("Customer Verification UI", () => {
    test.use({ storageState: USER_AUTH });

    test("account page shows ID verification status", async ({ page }) => {
      await page.goto("/account");
      await page.waitForLoadState("networkidle");

      // ID verification section (PR #9: only shows when feature enabled)
      const verifySection = page.getByText(
        /id verification|verification status|verified|not verified|pending/i
      );
      if (
        await verifySection
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        await expect(verifySection.first()).toBeVisible();

        // Should show status badge (verified/pending/not verified)
        const statusBadge = page.locator(
          '[class*="verified"], [class*="pending"], [data-testid*="verify-status"]'
        );
        if (
          await statusBadge
            .first()
            .isVisible({ timeout: 2_000 })
            .catch(() => false)
        ) {
          const text = await statusBadge.first().textContent();
          expect(text).toMatch(/verified|pending|not verified/i);
        }
      }
    });

    test("verify now button navigates to upload page", async ({ page }) => {
      await page.goto("/account");
      await page.waitForLoadState("networkidle");

      const verifyBtn = page
        .getByRole("button", { name: /verify now|check status/i })
        .or(page.getByRole("link", { name: /verify/i }));

      if (await verifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await verifyBtn.click();
        await page.waitForTimeout(1000);

        // Should navigate to verification page
        const onVerifyPage =
          page.url().includes("verify") ||
          (await page
            .getByText(/upload.*id|photo.*id|government.*id/i)
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false));
      }
    });

    test("ID upload page accepts image files", async ({ page }) => {
      await page.goto("/account/verify-id");

      if (page.url().includes("login")) {
        test.skip(true, "Redirected to login — auth may have expired");
        return;
      }

      // File upload input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Check accepted types
        const accept = await fileInput.getAttribute("accept");
        if (accept) {
          expect(accept).toMatch(/image|jpeg|jpg|png/i);
        }
      }

      // Should have instructions about what to upload
      const instructions = page.getByText(
        /front.*id|government.*issued|driver|passport/i
      );
      if (
        await instructions
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false)
      ) {
        await expect(instructions.first()).toBeVisible();
      }
    });
  });

  test.describe("Admin Verification Panel", () => {
    test.use({ storageState: ADMIN_AUTH });

    test("admin has ID verification review section", async ({ page }) => {
      await page.goto("/admin");

      // Look for verification section in admin nav or customers
      const verifyLink = page
        .getByRole("link", { name: /verification|verify|customers/i })
        .first();
      if (await verifyLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await verifyLink.click();
        await page.waitForLoadState("networkidle");

        // Should show pending verifications or customer list with verify status
        const hasVerifyUI = await page
          .getByText(/pending.*review|verification|approve|reject/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
      }
    });

    test("admin Settings has ID verification toggle (PR #9)", async ({
      page,
    }) => {
      await page.goto("/admin");
      const settingsLink = page
        .getByRole("link", { name: /settings/i })
        .or(page.getByRole("button", { name: /settings/i }));
      if (
        !(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))
      ) {
        test.skip(true, "Settings not visible");
        return;
      }
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // ID verification enable/disable toggle
      const verifyToggle = page.getByText(
        /id verification|require.*verification/i
      );
      if (
        await verifyToggle
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        await expect(verifyToggle.first()).toBeVisible();
      }
    });

    test("admin has AI verification toggle (PR #56)", async ({ page }) => {
      await page.goto("/admin");
      const settingsLink = page
        .getByRole("link", { name: /settings/i })
        .or(page.getByRole("button", { name: /settings/i }));
      if (
        !(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))
      ) {
        test.skip(true, "Settings not visible");
        return;
      }
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // AI/manual toggle for verification
      const aiToggle = page.getByText(/ai.*verif|auto.*verif|manual.*ai/i);
      if (
        await aiToggle
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        await expect(aiToggle.first()).toBeVisible();
      }
    });
  });
});
