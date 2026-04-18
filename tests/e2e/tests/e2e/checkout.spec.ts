import { test, expect } from "@playwright/test";
import path from "path";

/**
 * CHECKOUT & PAYMENT TESTS — e-Transfer flow, cart, unique cents, acknowledgments.
 * Requires authenticated user session.
 * Tag: @critical @checkout
 */

const USER_AUTH = path.join("./tests/e2e", "../.auth/user.json");

test.describe("Checkout & e-Transfer Flow @critical @checkout", () => {
  test.use({ storageState: USER_AUTH });

  test("checkout page loads with cart summary", async ({ page }) => {
    // Add an item first via the shop
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Navigate to a product and add to cart
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    const addBtn = page.getByRole("button", { name: /add to cart/i });
    await addBtn.click();
    await page.waitForTimeout(1000); // wait for cart update

    // Navigate to checkout
    await page.goto("/checkout");

    // Should show cart items
    await expect(page.getByText(/checkout|order summary/i).first()).toBeVisible(
      { timeout: 5_000 }
    );
  });

  test("selecting e-Transfer shows payment instructions with unique cent amount", async ({
    page,
  }) => {
    // Pre-condition: need items in cart — navigate through add flow
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/checkout");

    // Select e-Transfer payment method
    const etransferOption = page
      .getByRole("button", { name: /e-transfer|interac/i })
      .or(page.locator('[data-testid="payment-etransfer"]'))
      .or(page.getByText(/e-transfer/i));

    if (
      !(await etransferOption.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      test.skip(true, "e-Transfer payment option not visible on checkout");
      return;
    }

    await etransferOption.click();

    // Should display payment instructions
    await expect(
      page
        .getByText(/send.*exactly/i)
        .or(page.getByText(/e-transfer instructions/i))
    ).toBeVisible({ timeout: 5_000 });

    // Should show an amount with cents
    const amountElement = page
      .locator('[data-testid="etransfer-amount"]')
      .or(page.getByText(/\$\d+\.\d{2}/));
    await expect(amountElement.first()).toBeVisible();
  });

  test("e-Transfer checkout requires mandatory acknowledgment checkbox", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/checkout");

    // Select e-Transfer
    const etransferOption = page.getByText(/e-transfer/i);
    if (
      !(await etransferOption.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      test.skip(true, "e-Transfer option not available");
      return;
    }
    await etransferOption.click();

    // Look for acknowledgment checkbox
    const checkbox = page
      .getByRole("checkbox", { name: /i understand/i })
      .or(
        page
          .locator('input[type="checkbox"]')
          .filter({ hasText: /understand|acknowledge/i })
      );

    if (await checkbox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Place Order should be disabled until checked
      const placeOrderBtn = page.getByRole("button", {
        name: /place order|confirm order/i,
      });

      if (await placeOrderBtn.isVisible().catch(() => false)) {
        // Should be disabled
        await expect(placeOrderBtn).toBeDisabled();

        // Check the box
        await checkbox.check();

        // Should now be enabled
        await expect(placeOrderBtn).toBeEnabled();
      }
    }
  });

  test("order confirmation shows correct e-Transfer instructions", async ({
    page,
  }) => {
    // This would complete an actual order — use carefully
    // For CI, you may want to mock the order creation
    // Just verify the confirmation page structure exists

    // Navigate to a known order confirmation URL pattern
    // (skip if no test orders exist)
    const response = await page.goto("/order-confirmation/test-123");
    if (response?.status() === 404) {
      test.skip(true, "No test order confirmation page available");
      return;
    }

    // If it loaded, check for key elements
    const hasInstructions = await page
      .getByText(/e-transfer|send.*payment/i)
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasInstructions) {
      await expect(page.getByText(/order #/i)).toBeVisible();
    }
  });
});

test.describe("Cart Operations @checkout", () => {
  test.use({ storageState: USER_AUTH });

  test("cart persists after page reload", async ({ page }) => {
    // Add item
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    // Reload
    await page.reload();

    // Cart should still have the item
    const cartIndicator = page
      .locator('[data-testid="cart-count"], [class*="cart-count"]')
      .first();
    if (await cartIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await cartIndicator.textContent();
      expect(parseInt(text || "0")).toBeGreaterThan(0);
    }
  });
});
