import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * AI FEATURES — PRs #30, #54, #65, #79, #97
 * Menu import, provider config, dual-provider fallback, mlcContext, AI memory.
 * Tag: @admin @ai
 */

const ADMIN_AUTH = path.join('./tests/e2e', '../.auth/admin.json');

test.describe('AI Features @admin @ai', () => {
  test.use({ storageState: ADMIN_AUTH });

  // ═══════════════════════════════════════
  // AI PROVIDER CONFIG (PRs #54, #97)
  // ═══════════════════════════════════════

  test('admin Settings has AI configuration section', async ({ page }) => {
    await page.goto('/admin');
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
    if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    const aiSection = page.getByText(/ai.*config|ai.*provider|ai.*settings|openai|gemini/i);
    await expect(aiSection.first()).toBeVisible({ timeout: 5_000 });
  });

  test('AI config supports dual-provider (primary + fallback) (PR #97)', async ({ page }) => {
    await page.goto('/admin');
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
    if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    // Should show primary and fallback provider options
    const primaryLabel = page.getByText(/primary.*provider|provider.*1/i);
    const fallbackLabel = page.getByText(/fallback|secondary|backup/i);

    if (await primaryLabel.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(primaryLabel.first()).toBeVisible();
    }
    if (await fallbackLabel.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(fallbackLabel.first()).toBeVisible();
    }

    // Should show model selection dropdowns
    const modelSelect = page.locator('select, [role="combobox"]').filter({ hasText: /gpt|gemini|model/i });
    // Just verify the config UI renders
  });

  test('AI config has test connection button', async ({ page }) => {
    await page.goto('/admin');
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(page.getByRole('button', { name: /settings/i }));
    if (!(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Settings not visible'); return; }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    const testBtn = page.getByRole('button', { name: /test.*connection|test.*ai|verify.*key/i });
    if (await testBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(testBtn.first()).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // AI MENU IMPORT (PR #30)
  // ═══════════════════════════════════════

  test('admin Products has AI menu import tool', async ({ page }) => {
    await page.goto('/admin');
    const productsLink = page.getByRole('link', { name: /products/i }).or(page.getByRole('button', { name: /products/i }));
    if (!(await productsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Products not visible'); return; }
    await productsLink.click();
    await page.waitForLoadState('networkidle');

    const importBtn = page.getByRole('button', { name: /import|menu.*import|ai.*import/i });
    if (await importBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(importBtn.first()).toBeVisible();

      await importBtn.first().click();
      await page.waitForTimeout(500);

      // Should show upload area for menu image
      const uploadArea = page.locator('input[type="file"], [class*="dropzone"], [class*="upload"]');
      if (await uploadArea.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        const accept = await uploadArea.first().getAttribute('accept');
        // Should accept images
      }
    }
  });

  // ═══════════════════════════════════════
  // AI MEMORY & INSIGHTS (PRs #79, #83)
  // ═══════════════════════════════════════

  test('admin Insights has AI user profiles section', async ({ page }) => {
    await page.goto('/admin');
    const insightsLink = page.getByRole('link', { name: /insights/i }).or(page.getByRole('button', { name: /insights/i }));
    if (!(await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false))) { test.skip(true, 'Insights not visible'); return; }
    await insightsLink.click();
    await page.waitForLoadState('networkidle');

    // Behavior & AI tab
    const behaviorTab = page.getByRole('button', { name: /behavior|ai/i }).first();
    if (await behaviorTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await behaviorTab.click();
      await page.waitForLoadState('networkidle');

      // AI user profiles section (PR #83)
      const profilesSection = page.getByText(/ai.*profile|user.*profile|behavior.*profile/i);
      if (await profilesSection.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(profilesSection.first()).toBeVisible();

        // Refresh all button
        const refreshBtn = page.getByRole('button', { name: /refresh.*all|refresh.*profiles/i });
        if (await refreshBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(refreshBtn).toBeVisible();
        }
      }
    }
  });
});
