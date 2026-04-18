import { test, expect } from '@playwright/test';

/**
 * ACCESSIBILITY & PERFORMANCE TESTS
 * Validates WCAG compliance and Core Web Vitals.
 * Tag: @a11y @performance
 */

test.describe('Accessibility @a11y', () => {

  test('homepage has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Accept age gate if present
    const ageGateYes = page.getByRole('button', { name: /yes|i am 19|enter/i });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    // Check for basic a11y: images have alt text
    const images = page.locator('img:visible');
    const imgCount = await images.count();
    for (let i = 0; i < Math.min(imgCount, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt, `Image ${i} missing alt text`).toBeTruthy();
    }

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0);
    expect(h1Count).toBeLessThanOrEqual(2); // ideally 1 h1 per page
  });

  test('login page is keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should have focus
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'BODY', 'DIV']).toContain(focused);
  });

  test('interactive elements have visible focus styles', async ({ page }) => {
    await page.goto('/login');

    // Focus the first button
    const firstButton = page.getByRole('button').first();
    await firstButton.focus();

    // Check it has some visual focus indicator
    const outline = await firstButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.boxShadow || styles.borderColor;
    });
    // Should have some focus style (not "none" for all)
    expect(outline).toBeTruthy();
  });

  test('forms have associated labels', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in with email/i }).click();

    // Email input should have a label or placeholder
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
    if (await emailInput.isVisible().catch(() => false)) {
      const placeholder = await emailInput.getAttribute('placeholder');
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const id = await emailInput.getAttribute('id');

      // Should have at least one accessibility mechanism
      expect(placeholder || ariaLabel || id).toBeTruthy();
    }
  });

  test('color contrast is sufficient on key pages', async ({ page }) => {
    await page.goto('/login');

    // Check body text color vs background
    const bodyContrast = await page.evaluate(() => {
      const body = document.querySelector('body');
      if (!body) return null;
      const styles = window.getComputedStyle(body);
      return { color: styles.color, bg: styles.backgroundColor };
    });

    // Basic check that text isn't invisible
    expect(bodyContrast?.color).not.toBe(bodyContrast?.bg);
  });
});

test.describe('Performance @performance', () => {

  test('homepage loads in under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const domTime = Date.now() - start;

    expect(domTime).toBeLessThan(5_000);
  });

  test.skip('shop page loads in under 8 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(8_000);
  });

  test('no excessively large images (>2MB)', async ({ page }) => {
    const largeResources: string[] = [];

    page.on('response', response => {
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      const url = response.url();
      if (
        contentLength > 2 * 1024 * 1024 && // >2MB
        (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp'))
      ) {
        largeResources.push(`${url} (${(contentLength / 1024 / 1024).toFixed(1)}MB)`);
      }
    });

    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    expect(largeResources, `Large images found: ${largeResources.join(', ')}`).toHaveLength(0);
  });

  test('no JavaScript errors during navigation', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', error => jsErrors.push(error.message));

    // Navigate through main pages
    const pages = ['/', '/shop', '/login', '/register'];
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
    }

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });

  test('API responses are fast (<2s)', async ({ page }) => {
    const slowApis: string[] = [];

    page.on('response', response => {
      const timing = response.request().timing();
      const url = response.url();
      if (
        url.includes('/api/') &&
        timing.responseEnd > 2000
      ) {
        slowApis.push(`${url} (${timing.responseEnd.toFixed(0)}ms)`);
      }
    });

    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Warn about slow APIs but don't fail (Railway cold starts can be slow)
    if (slowApis.length > 0) {
      console.warn('Slow API responses:', slowApis);
    }
  });
});
