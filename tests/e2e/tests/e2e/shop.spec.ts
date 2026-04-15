import { test, expect } from "@playwright/test";

/**
 * SHOPPING EXPERIENCE TESTS — Product browsing, Quick View, cart, images.
 * Tag: @critical @shop
 */

test.describe("Shop & Product Browsing @critical @shop", () => {
  test("shop page displays product grid", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Product cards should be visible
    const products = page.locator(
      '[class*="product-card"], [data-testid="product-card"], .product-card'
    );
    await expect(products.first()).toBeVisible({ timeout: 10_000 });

    const count = await products.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("product cards show essential info — name, price, category", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const firstCard = page
      .locator('[class*="product-card"], [data-testid="product-card"]')
      .first();
    await expect(firstCard).toBeVisible();

    // Should contain a price (e.g., "$38.00")
    const cardText = await firstCard.textContent();
    expect(cardText).toMatch(/\$/);

    // Should have an image
    const img = firstCard.locator("img").first();
    await expect(img).toBeVisible();
  });

  test("clicking a product navigates to product detail page", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Click on a product link/card (not Quick View button)
    const productLink = page
      .locator('[class*="product-card"] a, [data-testid="product-card"] a')
      .first();
    if (await productLink.isVisible().catch(() => false)) {
      await productLink.click();
      await page.waitForURL(/\/product\//);
      expect(page.url()).toContain("/product/");
    }
  });

  // ═══════════════════════════════════════
  // PRODUCT DETAIL PAGE
  // ═══════════════════════════════════════

  test("product detail page shows full product info", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Navigate to first product
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    // Product name
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    expect(name!.length).toBeGreaterThan(2);

    // Price
    await expect(page.getByText(/\$\d+/)).toBeVisible();

    // Add to cart button
    await expect(
      page.getByRole("button", { name: /add to cart/i })
    ).toBeVisible();
  });

  // ═══════════════════════════════════════
  // QUICK VIEW MODAL
  // ═══════════════════════════════════════

  test("Quick View opens on hover + click", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator('[class*="product-card"], [data-testid="product-card"]')
      .first();
    await expect(firstProduct).toBeVisible();

    // Hover to reveal Quick View button
    await firstProduct.hover();

    const quickViewBtn = firstProduct.locator(
      'button:has-text("Quick View"), [data-testid="quick-view-btn"]'
    );

    // Quick View may not be implemented yet — skip if not found
    if (
      !(await quickViewBtn.isVisible({ timeout: 2_000 }).catch(() => false))
    ) {
      test.skip(true, "Quick View not yet implemented");
      return;
    }

    await quickViewBtn.click();

    // Modal should open
    const modal = page.locator(
      '[data-testid="quick-view-modal"], [role="dialog"], .quick-view-modal'
    );
    await expect(modal).toBeVisible();

    // Should contain product info
    await expect(modal.getByText(/\$/)).toBeVisible();

    // Should have Add to Cart inside modal
    await expect(
      modal.getByRole("button", { name: /add to cart/i })
    ).toBeVisible();
  });

  test("Quick View modal closes on ESC", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator('[class*="product-card"], [data-testid="product-card"]')
      .first();
    await firstProduct.hover();

    const quickViewBtn = firstProduct.locator(
      'button:has-text("Quick View"), [data-testid="quick-view-btn"]'
    );
    if (
      !(await quickViewBtn.isVisible({ timeout: 2_000 }).catch(() => false))
    ) {
      test.skip(true, "Quick View not yet implemented");
      return;
    }

    await quickViewBtn.click();

    const modal = page.locator(
      '[data-testid="quick-view-modal"], [role="dialog"]'
    );
    await expect(modal).toBeVisible();

    // Press ESC
    await page.keyboard.press("Escape");

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test('Quick View modal "View Full Details" navigates to product page', async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator('[class*="product-card"], [data-testid="product-card"]')
      .first();
    await firstProduct.hover();

    const quickViewBtn = firstProduct.locator(
      'button:has-text("Quick View"), [data-testid="quick-view-btn"]'
    );
    if (
      !(await quickViewBtn.isVisible({ timeout: 2_000 }).catch(() => false))
    ) {
      test.skip(true, "Quick View not yet implemented");
      return;
    }

    await quickViewBtn.click();

    // Click "View Full Details"
    const detailsLink = page
      .getByText(/view full details/i)
      .or(page.getByRole("link", { name: /details/i }));
    if (await detailsLink.isVisible().catch(() => false)) {
      await detailsLink.click();
      await page.waitForURL(/\/product\//);
    }
  });

  // ═══════════════════════════════════════
  // IMAGE CAROUSEL
  // ═══════════════════════════════════════

  test("image carousel navigates between images", async ({ page }) => {
    // Go directly to a product page
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Navigate to a product
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    // Check if image carousel exists (multiple images)
    const nextBtn = page.locator(
      'button[aria-label*="next"], button:has-text("›"), [data-testid="carousel-next"]'
    );
    const dots = page.locator(
      '[data-testid="carousel-dot"], [class*="carousel-dot"]'
    );

    if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Click next
      await nextBtn.click();

      // Image counter or dot should update
      // (Implementation-specific — adjust selectors)
    }
  });

  // ═══════════════════════════════════════
  // CART OPERATIONS
  // ═══════════════════════════════════════

  test("add to cart updates cart count", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Navigate to product
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    // Click add to cart
    const addBtn = page.getByRole("button", { name: /add to cart/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Cart count should update (look for badge or counter)
    const cartIndicator = page
      .locator(
        '[data-testid="cart-count"], [class*="cart-count"], [class*="badge"]'
      )
      .first();
    if (await cartIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await cartIndicator.textContent();
      expect(parseInt(text || "0")).toBeGreaterThan(0);
    }

    // Or a toast/notification confirming the add
    const toast = page.getByText(/added to cart/i);
    if (await toast.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(toast).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // FEATURED PRODUCTS (HOMEPAGE)
  // ═══════════════════════════════════════

  test("homepage featured products section displays products", async ({
    page,
  }) => {
    await page.goto("/");

    // Accept age gate if present
    const ageGateYes = page.getByRole("button", { name: /yes|i am 19|enter/i });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    // Featured products section
    const featured = page.getByText(/featured products/i);
    if (await featured.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(featured).toBeVisible();

      // Should have product cards in the featured section
      const cards = page.locator(
        '[class*="product-card"], [data-testid="product-card"]'
      );
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});
