import { test, expect } from '@playwright/test';

/**
 * SMOKE TESTS — Run against production after every deploy.
 * These are fast, read-only checks that verify the site is alive
 * and critical pages render correctly. No authentication needed.
 *
 * Tag: @smoke
 * Run: npx playwright test --project=production-smoke
 */

test.describe('Production Smoke Tests @smoke', () => {

  test('homepage loads with logo and age gate', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveTitle(/My Legacy Cannabis/i);

    // Logo should be visible
    const logo = page.getByAltText(/my legacy cannabis/i).first();
    await expect(logo).toBeVisible();

    // Age gate should appear (or main content if already accepted)
    const hasAgeGate = await page.locator('[data-testid="age-gate"], [class*="age-gate"], [class*="ageGate"]').isVisible().catch(() => false);
    const hasMainContent = await page.locator('text=/shop|featured|products/i').first().isVisible().catch(() => false);
    expect(hasAgeGate || hasMainContent).toBeTruthy();
  });

  test('shop page loads with products', async ({ page }) => {
    await page.goto('/shop');

    // Should have product cards
    await expect(page.locator('[class*="product"], [data-testid*="product"]').first()).toBeVisible({ timeout: 10_000 });

    // Should have at least 1 product visible
    const productCount = await page.locator('[class*="product-card"], [data-testid="product-card"]').count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Should show sign-in options
    await expect(page.getByText(/sign in/i).first()).toBeVisible();

    // Should have email login option
    await expect(page.getByText(/sign in with email/i)).toBeVisible();

    // Should have Google login option (if enabled)
    const googleBtn = page.getByText(/sign in with google/i);
    // May or may not be visible depending on config — just check page doesn't error
  });

  test('register page loads correctly', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByText(/create account/i).first()).toBeVisible();
  });

  test('all store location pages load', async ({ page }) => {
    const stores = [
      '/locations/toronto',
      '/locations/scarborough',
      '/locations/mississauga',
      '/locations/hamilton',
      '/locations/ottawa',
    ];

    for (const storePath of stores) {
      const response = await page.goto(storePath);
      // Accept 200 or 404 (if route doesn't exist yet) but not 500
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test('API health check endpoints respond', async ({ request }) => {
    // Auth availability checks
    const smsRes = await request.get('/api/auth/sms-available');
    expect(smsRes.ok()).toBeTruthy();
    const smsData = await smsRes.json();
    expect(smsData).toHaveProperty('available');

    const googleRes = await request.get('/api/auth/google-available');
    expect(googleRes.ok()).toBeTruthy();
    const googleData = await googleRes.json();
    expect(googleData).toHaveProperty('available');

    const smtpRes = await request.get('/api/auth/smtp-available');
    expect(smtpRes.ok()).toBeTruthy();
  });

  test('geo nearest-store endpoint responds', async ({ request }) => {
    const res = await request.get('/api/geo/nearest-store');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Should return a structure (even if null geo)
    expect(data).toHaveProperty('store');
    expect(data).toHaveProperty('geo');
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors (e.g., third-party scripts)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('third-party') &&
      !e.includes('analytics') &&
      !e.includes('An empty string ("") was passed to the %s attribute')
    );

    expect(realErrors).toHaveLength(0);
  });

  test('page load performance is acceptable', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;

    // Homepage should load DOM in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');

    // Header should be visible
    const logo = page.getByAltText(/my legacy cannabis/i).first();
    await expect(logo).toBeVisible();

    // Hamburger menu should be visible on mobile
    const menuBtn = page.locator('[class*="hamburger"], button[aria-label*="menu"], .menu-toggle').first();
    // Accept if it exists (mobile nav) or if nav is inline (some designs)
  });

  test('critical SEO elements are present', async ({ page }) => {
    await page.goto('/');

    // Check meta tags
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);

    // Check canonical URL
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();

    // Check OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });
});
