import { describe, expect, it } from "vitest";
import { detectRegressions } from "./searchConsoleService";
import type { SearchAnalyticsRow } from "./searchConsoleService";

/**
 * Tests for the Search Console service regression detection.
 * These tests don't require API keys or network access — they only
 * test the pure logic of detectRegressions().
 */

describe("searchConsoleService: detectRegressions", () => {
  it("detects keyword position drop > 3 positions", () => {
    const current: SearchAnalyticsRow[] = [
      {
        query: "my legacy cannabis",
        clicks: 5,
        impressions: 100,
        ctr: 0.05,
        position: 8.5,
      },
    ];
    const previous: SearchAnalyticsRow[] = [
      {
        query: "my legacy cannabis",
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 4.0,
      },
    ];

    const alerts = detectRegressions(current, previous);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    const kwAlert = alerts.find(a => a.alertType === "keyword_drop");
    expect(kwAlert).toBeDefined();
    expect(kwAlert!.message).toContain("my legacy cannabis");
    expect(kwAlert!.message).toContain("4.5 positions");
  });

  it("ignores small position changes (< 3 positions)", () => {
    const current: SearchAnalyticsRow[] = [
      {
        query: "cannabis dispensary",
        clicks: 10,
        impressions: 50,
        ctr: 0.2,
        position: 5.0,
      },
    ];
    const previous: SearchAnalyticsRow[] = [
      {
        query: "cannabis dispensary",
        clicks: 12,
        impressions: 50,
        ctr: 0.24,
        position: 3.5,
      },
    ];

    const alerts = detectRegressions(current, previous);
    const kwAlerts = alerts.filter(a => a.alertType === "keyword_drop");
    expect(kwAlerts.length).toBe(0);
  });

  it("detects CTR decline > 50% for high-impression keywords", () => {
    const current: SearchAnalyticsRow[] = [
      {
        query: "weed delivery toronto",
        clicks: 2,
        impressions: 100,
        ctr: 0.02,
        position: 5.0,
      },
    ];
    const previous: SearchAnalyticsRow[] = [
      {
        query: "weed delivery toronto",
        clicks: 8,
        impressions: 100,
        ctr: 0.08,
        position: 5.0,
      },
    ];

    const alerts = detectRegressions(current, previous);
    const ctrAlert = alerts.find(a => a.alertType === "ctr_decline");
    expect(ctrAlert).toBeDefined();
    expect(ctrAlert!.severity).toBe("warning");
  });

  it("detects total clicks decline > 30%", () => {
    const current: SearchAnalyticsRow[] = [
      { query: "a", clicks: 3, impressions: 50, ctr: 0.06, position: 5.0 },
      { query: "b", clicks: 2, impressions: 30, ctr: 0.07, position: 6.0 },
    ];
    const previous: SearchAnalyticsRow[] = [
      { query: "a", clicks: 10, impressions: 50, ctr: 0.2, position: 3.0 },
      { query: "b", clicks: 8, impressions: 30, ctr: 0.27, position: 4.0 },
    ];

    const alerts = detectRegressions(current, previous);
    const crawlAlert = alerts.find(a => a.alertType === "crawl_decline");
    expect(crawlAlert).toBeDefined();
    expect(crawlAlert!.severity).toBe("critical");
  });

  it("returns empty array when data is stable", () => {
    const current: SearchAnalyticsRow[] = [
      {
        query: "cannabis",
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 3.0,
      },
    ];
    const previous: SearchAnalyticsRow[] = [
      {
        query: "cannabis",
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 3.0,
      },
    ];

    const alerts = detectRegressions(current, previous);
    expect(alerts.length).toBe(0);
  });

  it("handles empty input arrays gracefully", () => {
    expect(detectRegressions([], [])).toEqual([]);
    expect(
      detectRegressions(
        [{ query: "test", clicks: 5, impressions: 50, ctr: 0.1, position: 3 }],
        []
      )
    ).toEqual([]);
  });

  it("assigns critical severity for high-impression keyword drops", () => {
    const current: SearchAnalyticsRow[] = [
      {
        query: "popular term",
        clicks: 20,
        impressions: 200,
        ctr: 0.1,
        position: 10.0,
      },
    ];
    const previous: SearchAnalyticsRow[] = [
      {
        query: "popular term",
        clicks: 50,
        impressions: 200,
        ctr: 0.25,
        position: 3.0,
      },
    ];

    const alerts = detectRegressions(current, previous);
    const kwAlert = alerts.find(a => a.alertType === "keyword_drop");
    expect(kwAlert).toBeDefined();
    expect(kwAlert!.severity).toBe("critical");
  });
});
