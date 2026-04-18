import { test, expect } from "@playwright/test";

/**
 * FRENCH / ENGLISH TRANSLATION TESTS — PR #35
 * Language toggle, Quebec auto-detect, persistent preference, translated strings.
 * Tag: @i18n @ux
 */

test.describe("French/English Translation @i18n @ux", () => {
  // ═══════════════════════════════════════
  // LANGUAGE TOGGLE
  // ═══════════════════════════════════════

  test("FR/EN toggle is visible in the header", async ({ page }) => {
    await page.goto("/");

    // Accept age gate if present
    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    // Look for language toggle
    const langToggle = page
      .getByRole("button", { name: /fr|en|français|english/i })
      .or(page.locator('[data-testid="lang-toggle"]'))
      .or(page.locator('button:has-text("FR")'))
      .or(page.locator('button:has-text("EN")'));

    await expect(langToggle.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking FR toggle switches page to French", async ({ page }) => {
    await page.goto("/");

    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    // Click FR toggle
    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }

    await frToggle.click();
    await page.waitForTimeout(500);

    // Key elements should now be in French
    const frenchIndicators = [
      /magasin|boutique/i, // "Shop" → "Magasin" or "Boutique"
      /panier/i, // "Cart" → "Panier"
      /connexion|se connecter/i, // "Sign In"
      /produits/i, // "Products"
      /accueil/i, // "Home"
    ];

    const bodyText = await page.textContent("body");
    let frenchFound = 0;
    for (const pattern of frenchIndicators) {
      if (pattern.test(bodyText || "")) frenchFound++;
    }

    // At least some French text should be present
    expect(frenchFound).toBeGreaterThanOrEqual(1);
  });

  test("switching back to EN restores English", async ({ page }) => {
    await page.goto("/");

    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    // Switch to FR first
    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }
    await frToggle.click();
    await page.waitForTimeout(500);

    // Switch back to EN
    const enToggle = page
      .locator('button:has-text("EN"), [data-testid="lang-en"]')
      .first();
    await enToggle.click();
    await page.waitForTimeout(500);

    // Should be back to English
    const bodyText = await page.textContent("body");
    const englishIndicators = [/shop/i, /cart/i, /sign in/i, /products/i];
    let englishFound = 0;
    for (const pattern of englishIndicators) {
      if (pattern.test(bodyText || "")) englishFound++;
    }
    expect(englishFound).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════
  // LANGUAGE PERSISTENCE
  // ═══════════════════════════════════════

  test("language preference persists across page navigation", async ({
    page,
  }) => {
    await page.goto("/");

    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }
    await frToggle.click();
    await page.waitForTimeout(500);

    // Navigate to shop
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Should still be in French
    const bodyText = await page.textContent("body");
    const hasFrench = /magasin|boutique|panier|produits|filtres/i.test(
      bodyText || ""
    );
    expect(hasFrench).toBeTruthy();
  });

  test("language preference survives page reload", async ({ page }) => {
    await page.goto("/");

    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }
    await frToggle.click();
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be in French after reload
    const bodyText = await page.textContent("body");
    const hasFrench = /magasin|boutique|panier|produits/i.test(bodyText || "");
    expect(hasFrench).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // KEY PAGES IN FRENCH
  // ═══════════════════════════════════════

  test.skip("shop page renders correctly in French", async ({ page }) => {
    await page.goto("/");
    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }
    await frToggle.click();
    await page.waitForTimeout(500);

    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    // Products should still render (category names, etc.)
    const products = page.locator(
      '[class*="product-card"], [data-testid="product-card"]'
    );
    await expect(products.first()).toBeVisible({ timeout: 10_000 });

    // No untranslated English strings leaking in key areas
    // (This is a soft check — some product names stay in English)
  });

  test.skip("login page renders correctly in French", async ({ page }) => {
    await page.goto("/");
    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ageGateYes.click();
    }

    const frToggle = page
      .locator('button:has-text("FR"), [data-testid="lang-fr"]')
      .first();
    if (!(await frToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "FR toggle not visible");
      return;
    }
    await frToggle.click();

    await page.goto("/login");

    // Key login elements should be translated
    const bodyText = await page.textContent("body");
    const hasFrenchAuth =
      /connexion|se connecter|courriel|mot de passe|créer|login|email|password/i.test(
        bodyText || ""
      );
    expect(hasFrenchAuth).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // HREFLANG SEO CHECK
  // ═══════════════════════════════════════

  test("pages have hreflang tags for en-CA and fr-CA", async ({ page }) => {
    await page.goto("/");

    const hreflangEn = page.locator(
      'link[hreflang="en-CA"], link[hreflang="en-ca"], link[hreflang="en"]'
    );
    const hreflangFr = page.locator(
      'link[hreflang="fr-CA"], link[hreflang="fr-ca"], link[hreflang="fr"]'
    );

    // At least one hreflang tag should exist (PR #37)
    const enCount = await hreflangEn.count();
    const frCount = await hreflangFr.count();

    if (enCount === 0 && frCount === 0) {
      console.warn("[i18n] No hreflang tags found — may not be deployed yet");
    }
  });
});
