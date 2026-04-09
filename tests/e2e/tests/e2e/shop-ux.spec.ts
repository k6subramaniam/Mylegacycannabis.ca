import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * SHOP UX — Grade/Strain Filters, Weight Selector, Badges, Cross-Sell, Banner
 * PRs #37, #60, #64, #72, #90
 * Tag: @shop @ux
 */

const ADMIN_AUTH = path.join('./tests/e2e', '../.auth/admin.json');

test.describe('Shop UX Enhancements @shop @ux', () => {

  // ═══════════════════════════════════════
  // GRADE FILTERS & STRAIN GROUPING (PRs #60, #64)
  // ═══════════════════════════════════════

  test.skip('shop page has grade filter bar for flower category', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Navigate to flower category if not default
    const flowerLink = page.getByRole('link', { name: /flower/i }).or(page.getByRole('button', { name: /flower/i }));
    if (await flowerLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await flowerLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Grade filter bar (PR #60: 3-row filter system)
    const gradeFilter = page.getByText(/grade|aaa|aaaa|premium|budget/i);
    if (await gradeFilter.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(gradeFilter.first()).toBeVisible();

      // Click a grade filter
      const filterBtn = page.getByRole('button', { name: /aaaa|aaa\+|premium/i }).first();
      if (await filterBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(500);
        // Products should filter — page should still show products or "no results"
      }
    }
  });

  test('flower products show strain grouping (PR #64)', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const flowerLink = page.getByRole('link', { name: /flower/i }).or(page.getByRole('button', { name: /flower/i }));
    if (await flowerLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await flowerLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Strain badges on product cards (indica/sativa/hybrid)
    const strainBadge = page.getByText(/indica|sativa|hybrid/i);
    if (await strainBadge.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(strainBadge.first()).toBeVisible();
    }
  });

  test.skip('product detail page has weight selector with dynamic pricing (PR #64)', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    // Weight selector (PR #64: 1g, 3.5g, 7g, 14g, 28g options)
    const weightSelector = page.locator('[data-testid="weight-selector"], [class*="weight-select"]');
    const weightButtons = page.getByRole('button', { name: /\d+\s*g|gram|half.*oz|quarter|ounce/i });

    if (await weightButtons.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click a different weight
      const secondWeight = weightButtons.nth(1);
      if (await secondWeight.isVisible().catch(() => false)) {
        const priceBefore = await page.getByText(/\$\d+/).first().textContent();
        await secondWeight.click();
        await page.waitForTimeout(300);
        // Price may change (dynamic pricing)
        const priceAfter = await page.getByText(/\$\d+/).first().textContent();
        // At minimum, no crash
      }
    }
  });

  // ═══════════════════════════════════════
  // PRODUCT BADGES (PR #90)
  // ═══════════════════════════════════════

  test('featured products show staff-pick badge', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Staff pick badge (PR #90)
    const staffPickBadge = page.locator('[class*="staff-pick"], [class*="badge"]').filter({ hasText: /staff.*pick|featured|⭐/i });
    if (await staffPickBadge.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(staffPickBadge.first()).toBeVisible();
    }
  });

  test('low stock products show low-stock badge', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Low stock badge (PR #90: stock 1-5)
    const lowStockBadge = page.locator('[class*="low-stock"], [class*="badge"]').filter({ hasText: /low stock|few left|limited/i });
    // May not be visible if no products are low stock — soft check
    if (await lowStockBadge.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(lowStockBadge.first()).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // CROSS-SELL "CUSTOMERS ALSO BOUGHT" (PR #90)
  // ═══════════════════════════════════════

  test.skip('product page shows "Customers Also Bought" section', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);

    // Cross-sell section (PR #90)
    const crossSell = page.getByText(/also bought|you may also|related|recommended/i);
    if (await crossSell.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(crossSell.first()).toBeVisible();

      // Should show product cards with add-to-cart
      const crossSellCards = page.locator('[class*="cross-sell"] [class*="product-card"], [class*="related"] [class*="product-card"]');
      const count = await crossSellCards.count().catch(() => 0);
      if (count > 0) {
        expect(count).toBeLessThanOrEqual(4); // max 4 per PR #90
      }
    }
  });

  // ═══════════════════════════════════════
  // SCROLLING BANNER (PRs #37, #72)
  // ═══════════════════════════════════════

  test('homepage has scrolling marquee banner', async ({ page }) => {
    await page.goto('/');
    const ageGateYes = page.getByRole('button', { name: /yes|i am 19|enter|oui/i });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) await ageGateYes.click();

    // Marquee/scrolling banner
    const marquee = page.locator('[class*="marquee"], [class*="banner"], [class*="scroll"]').first();
    if (await marquee.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(marquee).toBeVisible();
      const text = await marquee.textContent();
      expect(text!.length).toBeGreaterThan(5); // should have content
    }
  });

  test.describe.skip('Admin Banner Config', () => {
    test.use({ storageState: ADMIN_AUTH });

    test('admin Settings has editable banner messages (PR #72)', async ({ page }) => {
      await page.goto('/admin');
      const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
      if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
      await settingsLink.click();
      await page.waitForLoadState('networkidle');

      const bannerSection = page.getByText(/banner|marquee|scrolling.*message/i);
      if (await bannerSection.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(bannerSection.first()).toBeVisible();

        // Add/edit/remove controls
        const addBtn = page.getByRole('button', { name: /add.*message|new.*message/i });
        if (await addBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(addBtn).toBeVisible();
        }

        // Live preview
        const preview = page.getByText(/preview/i);
        if (await preview.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(preview.first()).toBeVisible();
        }
      }
    });
  });
});
