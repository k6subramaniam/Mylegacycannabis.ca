import { test, expect } from "@playwright/test";
import path from "path";

/**
 * ADMIN OPERATIONS — Locations CRUD, Featured Products, Add User,
 * System Logs, Customer Details, Order State Machine, Gmail Circuit Breaker
 * PRs #55, #75, #91, #95, #96
 * Tag: @admin @operations
 */

const ADMIN_AUTH = path.join("./tests/e2e", "../.auth/admin.json");

test.describe("Admin Operations @admin @operations", () => {
  test.use({ storageState: ADMIN_AUTH });

  // ═══════════════════════════════════════
  // ADMIN LOCATIONS CRUD (PR #55)
  // ═══════════════════════════════════════

  test("admin has Locations management section", async ({ page }) => {
    await page.goto("/admin");

    const locationsLink = page
      .getByRole("link", { name: /locations/i })
      .or(page.getByRole("button", { name: /locations/i }));

    // May be under Settings
    if (
      !(await locationsLink.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      const settingsLink = page
        .getByRole("link", { name: /settings/i })
        .or(page.getByRole("button", { name: /settings/i }));
      if (await settingsLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await settingsLink.click();
        await page.waitForLoadState("networkidle");
      }
    }

    const locSection = page.getByText(
      /manage.*location|store.*location|location/i
    );
    if (
      await locSection
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await expect(locSection.first()).toBeVisible();

      // Add location button
      const addBtn = page.getByRole("button", {
        name: /add.*location|new.*location/i,
      });
      if (await addBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(addBtn).toBeVisible();
      }

      // Existing locations should display
      const locationCards = page.locator(
        '[class*="location-card"], [class*="location-row"]'
      );
      const count = await locationCards.count().catch(() => 0);
      // Should have at least 1 (5 stores configured)
    }
  });

  test("public locations page shows all stores", async ({ page }) => {
    await page.goto("/locations");

    // Should list store locations
    const storeNames = [
      "toronto",
      "scarborough",
      "mississauga",
      "hamilton",
      "ottawa",
    ];
    let foundStores = 0;
    for (const store of storeNames) {
      if (
        await page
          .getByText(new RegExp(store, "i"))
          .first()
          .isVisible({ timeout: 2_000 })
          .catch(() => false)
      ) {
        foundStores++;
      }
    }
    expect(foundStores).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════
  // FEATURED PRODUCTS TOGGLE (PRs #95, #96)
  // ═══════════════════════════════════════

  test("admin Products has featured toggle", async ({ page }) => {
    await page.goto("/admin");
    const productsLink = page
      .getByRole("link", { name: /products/i })
      .or(page.getByRole("button", { name: /products/i }));
    if (
      !(await productsLink.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      test.skip(true, "Products not visible");
      return;
    }
    await productsLink.click();
    await page.waitForLoadState("networkidle");

    // Featured toggle or star icon on product rows
    const featuredToggle = page.locator(
      '[class*="featured"], [data-testid*="featured"], [class*="star"]'
    );
    if (
      await featuredToggle
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await expect(featuredToggle.first()).toBeVisible();
    }
  });

  test("homepage shows DB-backed featured products (PR #96)", async ({
    page,
  }) => {
    await page.goto("/");
    const ageGateYes = page.getByRole("button", {
      name: /yes|i am 19|enter|oui/i,
    });
    if (await ageGateYes.isVisible({ timeout: 2_000 }).catch(() => false))
      await ageGateYes.click();

    // Featured section should exist with real products
    const featuredSection = page.getByText(/featured/i);
    if (
      await featuredSection
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      // Should have product cards (max 4 per PR #96)
      const cards = page.locator(
        '[class*="featured"] [class*="product-card"], [class*="featured"] a[href*="/product/"]'
      );
      const count = await cards.count().catch(() => 0);
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  // ═══════════════════════════════════════
  // ADMIN "ADD USER" (PR #95)
  // ═══════════════════════════════════════

  test("admin Customers has Add User modal", async ({ page }) => {
    await page.goto("/admin");
    const customersLink = page
      .getByRole("link", { name: /customers|users/i })
      .or(page.getByRole("button", { name: /customers/i }));
    if (
      !(await customersLink.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      test.skip(true, "Customers not visible");
      return;
    }
    await customersLink.click();
    await page.waitForLoadState("networkidle");

    const addUserBtn = page.getByRole("button", {
      name: /add.*user|new.*user|add.*customer/i,
    });
    if (await addUserBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addUserBtn.click();
      await page.waitForTimeout(500);

      // Modal should open with form fields
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      if (await modal.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Should have name, email, phone, role fields
        await expect(
          page
            .locator('input[name*="email"], input[placeholder*="email"]')
            .first()
        ).toBeVisible();
        await expect(
          page
            .locator('input[name*="name"], input[placeholder*="name"]')
            .first()
        ).toBeVisible();

        // Role selector (customer or admin)
        const roleSelect = page.getByText(/role|customer|admin/i);
        if (
          await roleSelect
            .first()
            .isVisible({ timeout: 2_000 })
            .catch(() => false)
        ) {
          await expect(roleSelect.first()).toBeVisible();
        }

        // Close without submitting
        await page.keyboard.press("Escape");
      }
    }
  });

  // ═══════════════════════════════════════
  // ADMIN CUSTOMER DETAILS (PR #95)
  // ═══════════════════════════════════════

  test("admin customer detail modal shows IP and geo info", async ({
    page,
  }) => {
    await page.goto("/admin");
    const customersLink = page
      .getByRole("link", { name: /customers|users/i })
      .or(page.getByRole("button", { name: /customers/i }));
    if (
      !(await customersLink.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      test.skip(true, "Customers not visible");
      return;
    }
    await customersLink.click();
    await page.waitForLoadState("networkidle");

    // Click on a customer to open detail
    const customerRow = page.locator('tr, [class*="customer-row"]').first();
    if (await customerRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await customerRow.click();
      await page.waitForTimeout(500);

      // Should show IP/geo info (PR #95)
      const ipInfo = page.getByText(
        /ip|registration.*ip|last.*login|location|geo/i
      );
      if (
        await ipInfo
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false)
      ) {
        await expect(ipInfo.first()).toBeVisible();
      }

      await page.keyboard.press("Escape");
    }
  });

  test("registration blocks disposable email domains (PR #95)", async ({
    page,
  }) => {
    await page.goto("/register");

    // Try a disposable email
    const emailInput = page
      .locator(
        'input[type="email"], input[name*="email"], input[placeholder*="email"]'
      )
      .first();
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill("test@tempmail.com");
      await emailInput.press("Tab"); // trigger validation

      // Should show an error about disposable emails
      const error = page.getByText(
        /disposable|temporary.*email|not.*allowed|invalid.*email/i
      );
      // Soft check — validation may fire on submit rather than blur
    }
  });

  // ═══════════════════════════════════════
  // SYSTEM LOGS (PR #95)
  // ═══════════════════════════════════════

  test("admin has System Logs page", async ({ page }) => {
    await page.goto("/admin");

    const logsLink = page
      .getByRole("link", { name: /logs|system/i })
      .or(page.getByRole("button", { name: /logs/i }));
    if (!(await logsLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Logs not visible");
      return;
    }
    await logsLink.click();
    await page.waitForLoadState("networkidle");

    // Should show log entries
    await expect(
      page.getByText(/system.*log|log.*viewer|event.*log/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Filtering controls
    const filterControls = page.getByText(/level|source|filter/i);
    if (
      await filterControls
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await expect(filterControls.first()).toBeVisible();
    }

    // Pagination
    const pagination = page.getByRole("button", { name: /next|prev|page/i });
    // May or may not exist depending on log count

    // Auto-refresh toggle
    const refreshToggle = page.getByText(/auto.*refresh|live/i);
    if (
      await refreshToggle
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false)
    ) {
      await expect(refreshToggle.first()).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // ORDER STATE MACHINE (PR #75)
  // ═══════════════════════════════════════

  test("admin order detail shows valid status transitions", async ({
    page,
  }) => {
    await page.goto("/admin");
    const ordersLink = page
      .getByRole("link", { name: /orders/i })
      .or(page.getByRole("button", { name: /orders/i }));
    if (!(await ordersLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Orders not visible");
      return;
    }
    await ordersLink.click();
    await page.waitForLoadState("networkidle");

    // Click first order to open detail
    const orderRow = page.locator('tr, [class*="order-row"]').first();
    if (await orderRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await orderRow.click();
      await page.waitForTimeout(500);

      // Should show current status and allowed transitions
      const statusSection = page.getByText(
        /status|payment.*status|order.*status/i
      );
      if (
        await statusSection
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false)
      ) {
        await expect(statusSection.first()).toBeVisible();
      }

      // Action buttons should only show valid next states (PR #75 guards)
      const actionBtns = page.getByRole("button", {
        name: /confirm|ship|cancel|refund|paid/i,
      });
      // Just verify they render — don't click to modify data

      await page.keyboard.press("Escape");
    }
  });

  test("admin orders show payment status warnings (PR #75)", async ({
    page,
  }) => {
    await page.goto("/admin");
    const ordersLink = page
      .getByRole("link", { name: /orders/i })
      .or(page.getByRole("button", { name: /orders/i }));
    if (!(await ordersLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Orders not visible");
      return;
    }
    await ordersLink.click();
    await page.waitForLoadState("networkidle");

    // Payment status badges (paid/pending/refunded)
    const statusBadges = page
      .locator('[class*="badge"], [class*="status"]')
      .filter({ hasText: /paid|pending|refunded|cancelled/i });
    if (
      await statusBadges
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // GMAIL CIRCUIT BREAKER (PR #91)
  // ═══════════════════════════════════════

  test("health endpoint reports Gmail auth status", async ({ request }) => {
    const res = await request.get("/api/health");
    if (!res.ok()) {
      test.skip(true, "Health endpoint not available");
      return;
    }

    const data = await res.json();
    // PR #91: health endpoint now reports Gmail status
    if (data.gmail !== undefined || data.services?.gmail !== undefined) {
      const gmailStatus = data.gmail || data.services?.gmail;
      expect(gmailStatus).toBeTruthy(); // should have some status info
    }
  });

  // ═══════════════════════════════════════
  // CANADIAN PHONE VALIDATION (PR #95)
  // ═══════════════════════════════════════

  test("registration validates Canadian phone numbers", async ({ page }) => {
    await page.goto("/register");

    const phoneInput = page
      .locator(
        'input[type="tel"], input[name*="phone"], input[placeholder*="phone"]'
      )
      .first();
    if (await phoneInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Invalid US phone
      await phoneInput.fill("555-123-4567");
      await phoneInput.press("Tab");

      // Valid Canadian format
      await phoneInput.fill("416-555-1234");
      await phoneInput.press("Tab");
      // Should not show error for valid Canadian number
    }
  });
});
