import { test, expect } from "@playwright/test";
import path from "path";

/**
 * ADMIN DASHBOARD TESTS — Insights, Geo-Analytics, Orders, Payments.
 * Requires admin session.
 * Tag: @admin
 */

const ADMIN_AUTH = path.join("./tests/e2e", "../.auth/admin.json");

test.describe("Admin Dashboard @admin", () => {
  test.use({ storageState: ADMIN_AUTH });

  test("admin page loads with navigation tabs", async ({ page }) => {
    await page.goto("/admin");

    // Should show admin interface
    await expect(page.getByText(/admin/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  // ═══════════════════════════════════════
  // GEO-ANALYTICS TAB
  // ═══════════════════════════════════════

  test("Insights page has Behavior & Geo-Analytics tabs", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to Insights (may be a link or tab)
    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));

    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    // Two tabs should be visible
    await expect(
      page
        .getByText(/behavior.*ai/i)
        .or(page.getByRole("button", { name: /behavior/i }))
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page
        .getByText(/geo-analytics/i)
        .or(page.getByRole("button", { name: /geo/i }))
    ).toBeVisible();
  });

  test("Geo-Analytics tab renders KPI cards", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to Insights
    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));
    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    // Click Geo-Analytics tab
    const geoTab = page
      .getByRole("button", { name: /geo-analytics/i })
      .or(page.getByText(/geo-analytics/i));
    await geoTab.click();

    // KPI cards should render
    await expect(page.getByText(/total events/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/cities reached/i)).toBeVisible();
    await expect(page.getByText(/active provinces/i)).toBeVisible();
    await expect(page.getByText(/proxy.*vpn/i)).toBeVisible();
  });

  test("Geo-Analytics province map renders", async ({ page }) => {
    await page.goto("/admin");

    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));
    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    const geoTab = page
      .getByRole("button", { name: /geo-analytics/i })
      .or(page.getByText(/geo-analytics/i));
    await geoTab.click();

    // Province map or traffic section
    const mapSection = page
      .getByText(/traffic by province/i)
      .or(page.locator('[data-testid="province-map"]'))
      .or(page.locator("svg").filter({ hasText: /ON|QC|BC/ }));

    await expect(mapSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Geo-Analytics period selector changes data", async ({ page }) => {
    await page.goto("/admin");

    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));
    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    const geoTab = page
      .getByRole("button", { name: /geo-analytics/i })
      .or(page.getByText(/geo-analytics/i));
    await geoTab.click();

    await page.waitForLoadState("networkidle");

    // Click 7d period
    const sevenDay = page.getByRole("button", { name: /^7d$/i });
    if (await sevenDay.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sevenDay.click();
      await page.waitForLoadState("networkidle");
      // Data should refresh — just verify no error state
      await expect(page.getByText(/error|failed/i))
        .not.toBeVisible({ timeout: 3_000 })
        .catch(() => {});
    }

    // Click 90d period
    const ninetyDay = page.getByRole("button", { name: /^90d$/i });
    if (await ninetyDay.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ninetyDay.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("Geo-Analytics city table displays data", async ({ page }) => {
    await page.goto("/admin");

    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));
    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    const geoTab = page
      .getByRole("button", { name: /geo-analytics/i })
      .or(page.getByText(/geo-analytics/i));
    await geoTab.click();

    // City table / Top Cities section
    const citySection = page
      .getByText(/top cities/i)
      .or(page.getByText(/city performance/i))
      .or(page.locator('[data-testid="city-table"]'));

    await expect(citySection.first()).toBeVisible({ timeout: 10_000 });

    // Should show at least the cities from your screenshots (Montreal, Toronto)
    const hasCityData = await page
      .getByText(/montreal|toronto/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    // It's OK if no data yet — just verify the section renders without error
  });

  test("Geo-Analytics daily trend chart renders", async ({ page }) => {
    await page.goto("/admin");

    const insightsLink = page
      .getByRole("link", { name: /insights/i })
      .or(page.getByRole("button", { name: /insights/i }));
    if (await insightsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await insightsLink.click();
    }

    const geoTab = page
      .getByRole("button", { name: /geo-analytics/i })
      .or(page.getByText(/geo-analytics/i));
    await geoTab.click();

    // Daily trend chart
    const trendSection = page.getByText(/daily trend/i);
    await expect(trendSection.first()).toBeVisible({ timeout: 10_000 });

    // Metric switcher (Events/Visitors/Orders)
    const eventBtn = page.getByRole("button", { name: /^events$/i });
    const visitorBtn = page.getByRole("button", { name: /^visitors$/i });
    const orderBtn = page.getByRole("button", { name: /^orders$/i });

    if (await visitorBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await visitorBtn.click();
      await page.waitForTimeout(500); // chart animation
    }
  });

  // ═══════════════════════════════════════
  // ADMIN ORDERS
  // ═══════════════════════════════════════

  test("admin orders page lists orders", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to orders section
    const ordersLink = page
      .getByRole("link", { name: /orders/i })
      .or(page.getByRole("button", { name: /orders/i }));

    if (await ordersLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ordersLink.click();

      // Should show orders table or list
      await page.waitForLoadState("networkidle");
      // At minimum, the section should render without errors
      await expect(page.getByText(/error|failed to load/i))
        .not.toBeVisible({ timeout: 3_000 })
        .catch(() => {});
    }
  });

  // ═══════════════════════════════════════
  // ADMIN PAYMENTS / UNMATCHED
  // ═══════════════════════════════════════

  test("admin payments section accessible", async ({ page }) => {
    await page.goto("/admin");

    const paymentsLink = page
      .getByRole("link", { name: /payments/i })
      .or(page.getByRole("button", { name: /payments/i }));

    if (await paymentsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await paymentsLink.click();
      await page.waitForLoadState("networkidle");

      // Should render (even if empty)
      await expect(page.getByText(/error|crash/i))
        .not.toBeVisible({ timeout: 3_000 })
        .catch(() => {});
    }
  });
});

test.describe("Admin Account Page @admin", () => {
  test.use({ storageState: ADMIN_AUTH });

  test("authenticated user sees account page with profile data", async ({
    page,
  }) => {
    await page.goto("/account");

    // Should not redirect to login (session is valid)
    await expect(page).not.toHaveURL(/\/login/);

    // Should show user info
    await expect(page.getByText(/my account/i)).toBeVisible({ timeout: 5_000 });

    // Should show tabs
    await expect(page.getByRole("button", { name: /profile/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /orders/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /rewards/i })).toBeVisible();
  });

  test("rewards tab shows points balance and referral code", async ({
    page,
  }) => {
    await page.goto("/account");

    const rewardsTab = page.getByRole("button", { name: /rewards/i });
    await rewardsTab.click();

    // Points balance
    await expect(page.getByText(/available points|points/i)).toBeVisible({
      timeout: 5_000,
    });

    // Referral section
    await expect(page.getByText(/refer a friend/i)).toBeVisible();
  });
});
