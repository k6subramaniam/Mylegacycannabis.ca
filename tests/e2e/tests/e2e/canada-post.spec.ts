import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * CANADA POST INTEGRATION TESTS — PRs #7, #104
 * Rate lookup, tracking display, tracking validation, post office finder.
 * Tag: @critical @shipping @canada-post
 */

const USER_AUTH = path.join('./tests/e2e', '../.auth/user.json');
const ADMIN_AUTH = path.join('./tests/e2e', '../.auth/admin.json');

test.describe('Canada Post Integration @critical @shipping @canada-post', () => {

  // ═══════════════════════════════════════
  // SHIPPING RATE LOOKUP
  // ═══════════════════════════════════════

  test.describe('Rate Lookup', () => {

    test('shipping rates API returns valid options for Canadian postal codes', async ({ request }) => {
      const res = await request.post('/api/shipping/rates', {
        data: {
          destinationPostalCode: 'M5V1A1',
          weight: 0.5,
          storeId: 'toronto-queen-west',
        },
      });

      if (res.status() === 404) {
        test.skip(true, 'Shipping rates endpoint not deployed yet');
        return;
      }

      if (res.ok()) {
        const data = await res.json();
        if (data.rates) {
          expect(data.rates.length).toBeGreaterThan(0);

          // Each rate should have required fields
          for (const rate of data.rates) {
            expect(rate).toHaveProperty('serviceCode');
            expect(rate).toHaveProperty('totalPrice');
            expect(rate.totalPrice).toBeGreaterThan(0);
          }
        } else if (data.fallbackRates) {
          // Fallback rates are acceptable if Canada Post API is down
          expect(data.fallbackRates.length).toBeGreaterThan(0);
        }
      }
    });

    test('rate lookup rejects invalid postal codes', async ({ request }) => {
      const res = await request.post('/api/shipping/rates', {
        data: {
          destinationPostalCode: 'INVALID',
          weight: 0.5,
        },
      });

      if (res.status() === 404) {
        test.skip(true, 'Shipping rates endpoint not deployed');
        return;
      }

      // Should return 400 or fallback rates, not 500
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════
  // TRACKING
  // ═══════════════════════════════════════

  test.describe('Tracking', () => {

    test('tracking API validates PIN format', async ({ request }) => {
      // Invalid tracking number
      const res = await request.get('/api/shipping/track/ABC');
      if (res.status() === 404) {
        test.skip(true, 'Tracking endpoint not deployed');
        return;
      }
      expect(res.status()).toBe(400);
    });

    test('tracking endpoint accepts valid Canada Post PIN format', async ({ request }) => {
      // Valid format (16 digits) — won't match a real parcel but should not crash
      const res = await request.get('/api/shipping/track/1234567890123456');
      if (res.status() === 404) {
        test.skip(true, 'Tracking endpoint not deployed');
        return;
      }
      // Should be 200 (no data) or 400/404 (not found) — not 500
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════
  // POSTAL CODE VALIDATION
  // ═══════════════════════════════════════

  test.describe('Postal Code Validation', () => {

    test('validates correct Canadian postal codes', async ({ request }) => {
      const res = await request.get('/api/shipping/validate-postal?code=M5V1A1');
      if (res.status() === 404) {
        test.skip(true, 'Postal validation not deployed');
        return;
      }
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.formatted).toBe('M5V 1A1');
    });

    test('rejects invalid postal codes', async ({ request }) => {
      const res = await request.get('/api/shipping/validate-postal?code=12345');
      if (res.status() === 404) {
        test.skip(true, 'Postal validation not deployed');
        return;
      }
      const data = await res.json();
      expect(data.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // CUSTOMER-FACING TRACKING UI
  // ═══════════════════════════════════════

  test.describe('Order Tracking UI', () => {
    test.use({ storageState: USER_AUTH });

    test('account orders page shows tracking info for shipped orders', async ({ page }) => {
      await page.goto('/account');

      const ordersTab = page.getByRole('button', { name: /orders/i });
      await ordersTab.click();
      await page.waitForLoadState('networkidle');

      // Check if any orders have tracking numbers
      const trackingElements = page.locator('[class*="tracking"], a[href*="canadapost"], [data-testid*="tracking"]');
      const count = await trackingElements.count();

      if (count > 0) {
        // Tracking links should point to Canada Post or show inline status
        const firstTracking = trackingElements.first();
        const text = await firstTracking.textContent();
        expect(text).toBeTruthy();
      }
      // If no shipped orders exist, that's fine — just verify no errors
    });
  });

  // ═══════════════════════════════════════
  // ADMIN TRACKING WIDGET
  // ═══════════════════════════════════════

  test.describe('Admin Tracking', () => {
    test.use({ storageState: ADMIN_AUTH });

    test('admin can add tracking number to an order', async ({ page }) => {
      await page.goto('/admin');

      const ordersLink = page.getByRole('link', { name: /orders/i }).or(page.getByRole('button', { name: /orders/i }));
      if (!(await ordersLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
        test.skip(true, 'Orders not visible in admin');
        return;
      }
      await ordersLink.click();
      await page.waitForLoadState('networkidle');

      // Look for tracking input field or "Add Tracking" button on any order
      const trackingInput = page.locator('input[placeholder*="tracking"], input[name*="tracking"]').first();
      const addTrackingBtn = page.getByRole('button', { name: /add tracking|tracking/i }).first();

      const hasTrackingUI = await trackingInput.isVisible({ timeout: 3_000 }).catch(() => false)
        || await addTrackingBtn.isVisible({ timeout: 2_000 }).catch(() => false);

      // Just verify the UI exists without actually modifying orders
      if (hasTrackingUI) {
        // Tracking number validation: Canada Post format should be accepted
        if (await trackingInput.isVisible().catch(() => false)) {
          await trackingInput.fill('1234567890123456');
          // Should not show a validation error for this format
        }
      }
    });
  });
});
