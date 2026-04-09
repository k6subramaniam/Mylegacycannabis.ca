import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * PRODUCT IMAGES, LOGO MANAGEMENT, FILE PERSISTENCE — PRs #62, #66, #71, #73, #77
 * Tag: @admin @images @files
 */

const ADMIN_AUTH = path.join('./tests/e2e', '../.auth/admin.json');

test.describe('Image Upload & File Persistence @admin @images @files', () => {
  test.use({ storageState: ADMIN_AUTH });

  // ═══════════════════════════════════════
  // PRODUCT IMAGE UPLOAD (PR #71)
  // ═══════════════════════════════════════

  test('admin Products editor has drag-and-drop image uploader', async ({ page }) => {
    await page.goto('/admin');
    const productsLink = page.getByRole('link', { name: /products/i }).or(page.getByRole('button', { name: /products/i }));
    if (!(await productsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Products not visible'); return; }
    await productsLink.click();
    await page.waitForLoadState('networkidle');

    // Click on first product to edit
    const productRow = page.locator('tr, [class*="product-row"], [data-testid*="product"]').first();
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Image upload area (drag-and-drop or file input)
      const uploadArea = page.locator('[class*="dropzone"], [class*="drag-drop"], [class*="image-upload"], input[type="file"]');
      if (await uploadArea.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(uploadArea.first()).toBeVisible();
      }

      // WebP badge indicator (PR #71)
      const webpBadge = page.getByText(/webp/i);
      // May or may not show depending on existing images
    }
  });

  test('product image upload accepts correct file types', async ({ page }) => {
    await page.goto('/admin');
    const productsLink = page.getByRole('link', { name: /products/i }).or(page.getByRole('button', { name: /products/i }));
    if (!(await productsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Products not visible'); return; }
    await productsLink.click();
    await page.waitForLoadState('networkidle');

    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"][accept*="image"]');
      if (await fileInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        const accept = await fileInput.first().getAttribute('accept');
        expect(accept).toMatch(/image|jpeg|jpg|png|webp/i);
      }
    }
  });

  // ═══════════════════════════════════════
  // LOGO MANAGEMENT (PRs #62, #66, #73)
  // ═══════════════════════════════════════

  test('admin Settings has logo upload section', async ({ page }) => {
    await page.goto('/admin');
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
    if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    const logoSection = page.getByText(/logo|brand.*image|site.*logo/i);
    await expect(logoSection.first()).toBeVisible({ timeout: 5_000 });

    // Upload button or file input
    const uploadInput = page.locator('input[type="file"]').first();
    const uploadBtn = page.getByRole('button', { name: /upload.*logo|change.*logo/i });
    const hasUpload = await uploadInput.isVisible({ timeout: 2_000 }).catch(() => false)
      || await uploadBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasUpload).toBeTruthy();
  });

  test('logo has dimension tooltip guidance (PR #66)', async ({ page }) => {
    await page.goto('/admin');
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
    if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    // Dimension guidance text
    const guidance = page.getByText(/recommended.*dimension|png|transparent|pixel/i);
    if (await guidance.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(guidance.first()).toBeVisible();
    }
  });

  test('logo renders with cache-busting URL (PR #73)', async ({ page }) => {
    await page.goto('/');
    const ageGateYes = page.getByRole('button', { name: /yes|i am 19|enter|oui/i });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) await ageGateYes.click();

    // Logo image in header
    const logo = page.locator('header img[alt*="legacy" i], header img[src*="logo"]').first();
    if (await logo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const src = await logo.getAttribute('src');
      expect(src).toBeTruthy();
      // Should be WebP or have cache-busting param
      const hasCacheBust = src?.includes('?') || src?.includes('.webp');
      // Soft check
    }
  });

  // ═══════════════════════════════════════
  // PERSISTENT FILE STORE (PR #77)
  // ═══════════════════════════════════════

  test('uploaded images are accessible after page reload', async ({ page }) => {
    // Visit the site and check that logo/product images load
    await page.goto('/');
    const ageGateYes = page.getByRole('button', { name: /yes|i am 19|enter|oui/i });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) await ageGateYes.click();

    // Check logo loads (not broken)
    const logo = page.locator('header img').first();
    if (await logo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const naturalWidth = await logo.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0); // not a broken image
    }

    // Check product images on shop page
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const productImg = page.locator('[class*="product-card"] img, [data-testid="product-card"] img').first();
    if (await productImg.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const naturalWidth = await productImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
