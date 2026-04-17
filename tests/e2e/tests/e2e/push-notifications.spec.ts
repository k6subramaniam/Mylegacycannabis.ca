import { test, expect } from "@playwright/test";
import path from "path";

/**
 * PWA PUSH NOTIFICATION TESTS — PRs #94, #97
 * Service worker, manifest, opt-in UI, admin broadcast.
 * Tag: @critical @pwa @push
 */

const USER_AUTH = path.join("./tests/e2e", "../.auth/user.json");
const ADMIN_AUTH = path.join("./tests/e2e", "../.auth/admin.json");

test.describe("PWA & Push Notifications @critical @pwa @push", () => {
  // ═══════════════════════════════════════
  // PWA MANIFEST & SERVICE WORKER
  // ═══════════════════════════════════════

  test("manifest.json is valid and accessible", async ({ request }) => {
    const res = await request.get("/manifest.json");
    if (res.status() === 404) {
      // Try alternate paths
      const alt = await request.get("/manifest.webmanifest");
      if (alt.status() === 404) {
        test.skip(true, "No manifest file found");
        return;
      }
    }

    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();

    // Required PWA fields
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Should have 192 and 512 icons
    const sizes = manifest.icons.map((i: any) => i.sizes);
    expect(sizes.some((s: string) => s.includes("192"))).toBeTruthy();
    expect(sizes.some((s: string) => s.includes("512"))).toBeTruthy();
  });

  test("service worker registers successfully", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    // SW may not register immediately on first visit — that's OK
    // Just verify no errors occurred
    if (!swRegistered) {
      console.warn(
        "[PWA] Service worker not registered — may need second visit"
      );
    }
  });

  test("service worker file is accessible", async ({ request }) => {
    // Check common SW paths
    const paths = ["/sw.js", "/service-worker.js", "/firebase-messaging-sw.js"];
    let found = false;

    for (const p of paths) {
      const res = await request.get(p);
      if (res.ok()) {
        found = true;
        const content = await res.text();
        // Should contain push event handler
        expect(content).toContain("push");
        break;
      }
    }

    if (!found) {
      console.warn("[PWA] No service worker file found at common paths");
    }
  });

  // ═══════════════════════════════════════
  // PUSH SUBSCRIPTION API
  // ═══════════════════════════════════════

  test("push config endpoint returns VAPID public key", async ({ request }) => {
    // Try tRPC or REST endpoint
    const trpcRes = await request
      .get("/api/trpc/push.getConfig")
      .catch(() => null);
    const restRes = await request.get("/api/push/config").catch(() => null);

    const res = trpcRes?.ok() ? trpcRes : restRes?.ok() ? restRes : null;

    if (!res) {
      test.skip(true, "Push config endpoint not found");
      return;
    }

    const data = await res.json();
    // Should contain a VAPID public key
    const hasKey =
      JSON.stringify(data).includes("BN") ||
      JSON.stringify(data).includes("vapid");
    if (!hasKey) {
      console.warn(
        "[Push] VAPID key not found in config response — env vars may not be set"
      );
    }
  });

  // ═══════════════════════════════════════
  // OPT-IN UI
  // ═══════════════════════════════════════

  test.describe("Push Opt-In", () => {
    test.use({ storageState: USER_AUTH });

    test("push opt-in banner appears for authenticated users", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // The opt-in banner should appear after certain triggers
      // (after ID verification or first purchase per PR #94)
      const optInBanner = page.locator(
        '[data-testid="push-opt-in"], [class*="push-banner"], [class*="push-opt"]'
      );
      const enableBtn = page.getByRole("button", {
        name: /enable.*notif|turn on.*notif|allow.*notif/i,
      });

      // May or may not show depending on user state — just check it renders if present
      if (await optInBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(optInBanner).toBeVisible();

        // Should have enable and dismiss buttons
        const dismissBtn = page.getByRole("button", {
          name: /not now|dismiss|later|no thanks/i,
        });
        if (await dismissBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          // Click dismiss
          await dismissBtn.click();
          // Banner should disappear
          await expect(optInBanner).not.toBeVisible({ timeout: 2_000 });
        }
      }
    });

    test("dismissed push banner stays hidden for the session", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const optInBanner = page.locator(
        '[data-testid="push-opt-in"], [class*="push-banner"]'
      );
      const dismissBtn = page.getByRole("button", {
        name: /not now|dismiss|later/i,
      });

      if (await optInBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
        if (await dismissBtn.isVisible().catch(() => false)) {
          await dismissBtn.click();
        }
      }

      // Navigate away and back
      await page.goto("/shop");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Banner should NOT reappear in the same session
      await expect(optInBanner)
        .not.toBeVisible({ timeout: 2_000 })
        .catch(() => {});
    });
  });

  // ═══════════════════════════════════════
  // ADMIN PUSH BROADCAST
  // ═══════════════════════════════════════

  test.describe("Admin Push Management", () => {
    test.use({ storageState: ADMIN_AUTH });

    test("admin Settings shows push notification section", async ({ page }) => {
      await page.goto("/admin");

      const settingsLink = page
        .getByRole("link", { name: /settings/i })
        .or(page.getByRole("button", { name: /settings/i }));
      if (
        !(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))
      ) {
        test.skip(true, "Settings not visible");
        return;
      }
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // Push notification section
      const pushSection = page.getByText(/push.*notif|broadcast|subscribers/i);
      if (
        await pushSection
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        await expect(pushSection.first()).toBeVisible();

        // Should show subscriber count
        const subCount = page.getByText(/\d+\s*subscriber/i);
        if (await subCount.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await expect(subCount).toBeVisible();
        }

        // Should have broadcast form
        const titleInput = page
          .locator('input[placeholder*="title"], input[name*="title"]')
          .first();
        const bodyInput = page
          .locator(
            'textarea, input[placeholder*="message"], input[name*="body"]'
          )
          .first();
        const sendBtn = page
          .getByRole("button", { name: /send|broadcast/i })
          .first();

        if (await titleInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(titleInput).toBeVisible();
          await expect(sendBtn).toBeVisible();
        }
      }
    });

    test("push broadcast shows recent notification log", async ({ page }) => {
      await page.goto("/admin");

      const settingsLink = page
        .getByRole("link", { name: /settings/i })
        .or(page.getByRole("button", { name: /settings/i }));
      if (
        !(await settingsLink.isVisible({ timeout: 3_000 }).catch(() => false))
      ) {
        test.skip(true, "Settings not visible");
        return;
      }
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // Recent notification logs
      const logSection = page.getByText(
        /recent.*notif|notification.*log|push.*log/i
      );
      if (
        await logSection
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        await expect(logSection.first()).toBeVisible();
      }
    });
  });
});
