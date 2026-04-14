/**
 * Google Search Console API Service
 *
 * Provides automated SEO monitoring by fetching data from the
 * Google Search Console API and storing it in the database.
 *
 * Features:
 *  - Search analytics (clicks, impressions, CTR, position by query/page)
 *  - Sitemap status and index coverage
 *  - Regression detection (keyword drops, crawl decline, index drops)
 *  - Alert generation for admin dashboard
 *
 * Setup:
 *  1. Create a Google Cloud service account
 *  2. Enable Search Console API
 *  3. Add service account email as user in Search Console
 *  4. Set GSC_SERVICE_ACCOUNT_KEY env var (JSON string)
 *  5. Set GSC_SITE_URL env var (verified property URL)
 *
 * @see https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

import * as db from "./db";

// ── TYPES ────────────────────────────────────────────────────

export interface SearchAnalyticsRow {
  query?: string;
  page?: string;
  device?: string;
  country?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsSummary {
  date: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueries: SearchAnalyticsRow[];
  topPages: SearchAnalyticsRow[];
}

export interface SitemapStatus {
  path: string;
  lastSubmitted: string;
  lastDownloaded: string;
  isPending: boolean;
  warnings: number;
  errors: number;
  contents: Array<{
    type: string;
    submitted: number;
    indexed: number;
  }>;
}

export interface SeoAlertInput {
  alertType: string;
  severity: "warning" | "critical";
  message: string;
  data?: Record<string, unknown>;
}

export interface SeoDashboardData {
  latestMetrics: {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    indexedPages: number;
  } | null;
  trend: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  alerts: Array<{
    id: number;
    alertType: string;
    severity: string;
    message: string;
    data: unknown;
    acknowledged: boolean;
    createdAt: Date | null;
  }>;
  topKeywords: SearchAnalyticsRow[];
  topPages: SearchAnalyticsRow[];
}

// ── CONFIG ────────────────────────────────────────────────────

const GSC_SERVICE_ACCOUNT_KEY = process.env.GSC_SERVICE_ACCOUNT_KEY || "";
const GSC_SITE_URL =
  process.env.GSC_SITE_URL ||
  process.env.SITE_URL ||
  "https://mylegacycannabisca-production.up.railway.app";

/**
 * Check if the Google Search Console service is configured.
 * Returns true if the service account key is set.
 */
export function isGscConfigured(): boolean {
  return GSC_SERVICE_ACCOUNT_KEY.length > 0;
}

// ── GOOGLE AUTH ───────────────────────────────────────────────

let _authToken: string | null = null;
let _tokenExpiry = 0;

/**
 * Get an authenticated access token for the Search Console API.
 * Uses a service account JWT flow (no user interaction needed).
 */
async function getAccessToken(): Promise<string> {
  if (_authToken && Date.now() < _tokenExpiry) return _authToken;

  if (!GSC_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_KEY not configured — cannot authenticate with Google Search Console API"
    );
  }

  // Parse the service account key JSON
  let key: {
    client_email: string;
    private_key: string;
    token_uri: string;
  };
  try {
    key = JSON.parse(GSC_SERVICE_ACCOUNT_KEY);
  } catch {
    throw new Error("GSC_SERVICE_ACCOUNT_KEY is not valid JSON");
  }

  // Build JWT for service account auth
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  // Sign with RSA-SHA256 using Node.js crypto
  const { createSign } = await import("crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key.private_key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(
    key.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`GSC auth failed: ${tokenRes.status} ${err}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
  };
  _authToken = tokenData.access_token;
  _tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000;
  return _authToken;
}

// ── API CALLS ────────────────────────────────────────────────

/**
 * Fetch search analytics data from the Search Console API.
 */
export async function fetchSearchAnalytics(
  startDate: string,
  endDate: string,
  dimensions: string[] = ["query"],
  rowLimit = 100
): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken();
  const encodedSite = encodeURIComponent(GSC_SITE_URL);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit,
        dimensionFilterGroups: [],
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC searchAnalytics failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
  };

  return (data.rows || []).map(row => ({
    query: dimensions.includes("query") ? row.keys[0] : undefined,
    page: dimensions.includes("page")
      ? row.keys[dimensions.indexOf("page")]
      : undefined,
    device: dimensions.includes("device")
      ? row.keys[dimensions.indexOf("device")]
      : undefined,
    country: dimensions.includes("country")
      ? row.keys[dimensions.indexOf("country")]
      : undefined,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/**
 * Fetch sitemap status from the Search Console API.
 */
export async function fetchSitemapStatus(): Promise<SitemapStatus[]> {
  const token = await getAccessToken();
  const encodedSite = encodeURIComponent(GSC_SITE_URL);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC sitemaps failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    sitemap?: Array<{
      path: string;
      lastSubmitted: string;
      lastDownloaded: string;
      isPending: boolean;
      warnings: string;
      errors: string;
      contents: Array<{
        type: string;
        submitted: string;
        indexed: string;
      }>;
    }>;
  };

  return (data.sitemap || []).map(s => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted,
    lastDownloaded: s.lastDownloaded,
    isPending: s.isPending,
    warnings: parseInt(s.warnings) || 0,
    errors: parseInt(s.errors) || 0,
    contents: (s.contents || []).map(c => ({
      type: c.type,
      submitted: parseInt(c.submitted) || 0,
      indexed: parseInt(c.indexed) || 0,
    })),
  }));
}

/**
 * Ping Google to re-fetch the sitemap (after deploy or content update).
 */
export async function pingSitemap(
  sitemapUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const url = sitemapUrl || `${GSC_SITE_URL}/sitemap.xml`;
  try {
    // Use the public sitemap ping endpoint (no auth required)
    const res = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    return { success: res.ok };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

// ── REGRESSION DETECTION ─────────────────────────────────────

/**
 * Compare two periods of search analytics data and detect regressions.
 * Generates alerts when:
 *  - Any keyword drops > 3 positions week-over-week
 *  - Overall CTR declines > 20% week-over-week
 *  - Total clicks decline > 30% week-over-week
 */
export function detectRegressions(
  current: SearchAnalyticsRow[],
  previous: SearchAnalyticsRow[]
): SeoAlertInput[] {
  const alerts: SeoAlertInput[] = [];

  // Build lookup maps by query
  const prevMap = new Map<string, SearchAnalyticsRow>();
  for (const row of previous) {
    if (row.query) prevMap.set(row.query, row);
  }

  // Check individual keyword regressions
  for (const row of current) {
    if (!row.query) continue;
    const prev = prevMap.get(row.query);
    if (!prev) continue;

    // Position drop > 3 positions
    if (row.position - prev.position > 3 && prev.impressions > 10) {
      alerts.push({
        alertType: "keyword_drop",
        severity: row.impressions > 100 ? "critical" : "warning",
        message: `Keyword "${row.query}" dropped ${(row.position - prev.position).toFixed(1)} positions (${prev.position.toFixed(1)} \u2192 ${row.position.toFixed(1)})`,
        data: {
          query: row.query,
          previousPosition: prev.position,
          currentPosition: row.position,
          impressions: row.impressions,
        },
      });
    }

    // CTR drop > 50% for high-impression keywords
    if (
      prev.ctr > 0 &&
      (prev.ctr - row.ctr) / prev.ctr > 0.5 &&
      prev.impressions > 50
    ) {
      alerts.push({
        alertType: "ctr_decline",
        severity: "warning",
        message: `CTR for "${row.query}" dropped ${(((prev.ctr - row.ctr) / prev.ctr) * 100).toFixed(0)}% (${(prev.ctr * 100).toFixed(1)}% \u2192 ${(row.ctr * 100).toFixed(1)}%)`,
        data: {
          query: row.query,
          previousCtr: prev.ctr,
          currentCtr: row.ctr,
        },
      });
    }
  }

  // Aggregate comparison
  const totalCurrentClicks = current.reduce((s, r) => s + r.clicks, 0);
  const totalPrevClicks = previous.reduce((s, r) => s + r.clicks, 0);
  if (
    totalPrevClicks > 10 &&
    (totalPrevClicks - totalCurrentClicks) / totalPrevClicks > 0.3
  ) {
    alerts.push({
      alertType: "crawl_decline",
      severity: "critical",
      message: `Total clicks dropped ${(((totalPrevClicks - totalCurrentClicks) / totalPrevClicks) * 100).toFixed(0)}% week-over-week (${totalPrevClicks} \u2192 ${totalCurrentClicks})`,
      data: {
        previousClicks: totalPrevClicks,
        currentClicks: totalCurrentClicks,
      },
    });
  }

  return alerts;
}

// ── DAILY COLLECTION JOB ─────────────────────────────────────

/**
 * Collect SEO metrics for the previous day.
 * Called by the daily cron job in startServer.ts.
 * Uses db.ts exports for all database operations.
 */
export async function collectSeoMetrics(): Promise<{
  collected: boolean;
  alertsGenerated: number;
  error?: string;
}> {
  if (!isGscConfigured()) {
    return {
      collected: false,
      alertsGenerated: 0,
      error: "GSC not configured",
    };
  }

  try {
    // GSC data has a 48-72h delay; fetch data from 3 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    const dateStr = endDate.toISOString().split("T")[0];

    // Fetch search analytics (by query)
    const queryData = await fetchSearchAnalytics(
      startDate.toISOString().split("T")[0],
      dateStr,
      ["query"],
      100
    );

    // Fetch search analytics (by page)
    const pageData = await fetchSearchAnalytics(
      startDate.toISOString().split("T")[0],
      dateStr,
      ["page"],
      100
    );

    // Fetch sitemap status
    let sitemapData: SitemapStatus[] = [];
    try {
      sitemapData = await fetchSitemapStatus();
    } catch (err) {
      console.warn(
        "[GSC] Sitemap fetch failed (non-fatal):",
        (err as Error).message
      );
    }

    // Store in database via db.ts exports
    const summary: SearchAnalyticsSummary = {
      date: dateStr,
      totalClicks: queryData.reduce((s, r) => s + r.clicks, 0),
      totalImpressions: queryData.reduce((s, r) => s + r.impressions, 0),
      avgCtr:
        queryData.length > 0
          ? queryData.reduce((s, r) => s + r.ctr, 0) / queryData.length
          : 0,
      avgPosition:
        queryData.length > 0
          ? queryData.reduce((s, r) => s + r.position, 0) / queryData.length
          : 0,
      topQueries: queryData.slice(0, 50),
      topPages: pageData.slice(0, 50),
    };

    await db.insertSeoMetric({
      date: dateStr,
      metricType: "search_analytics",
      data: summary,
    });

    if (sitemapData.length > 0) {
      await db.insertSeoMetric({
        date: dateStr,
        metricType: "sitemap_status",
        data: sitemapData,
      });
    }

    // Regression detection: compare to previous week
    const prevEndDate = new Date(endDate);
    prevEndDate.setDate(prevEndDate.getDate() - 7);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - 1);

    let alertsGenerated = 0;
    try {
      const prevData = await fetchSearchAnalytics(
        prevStartDate.toISOString().split("T")[0],
        prevEndDate.toISOString().split("T")[0],
        ["query"],
        100
      );

      const regressions = detectRegressions(queryData, prevData);
      for (const alert of regressions) {
        await db.insertSeoAlert(alert);
        alertsGenerated++;
      }
    } catch (err) {
      console.warn(
        "[GSC] Regression comparison failed (non-fatal):",
        (err as Error).message
      );
    }

    console.log(
      `[GSC] Collected metrics for ${dateStr}: ${summary.totalClicks} clicks, ${summary.totalImpressions} impressions, ${alertsGenerated} alerts`
    );

    return { collected: true, alertsGenerated };
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[GSC] Collection failed:", msg);
    return { collected: false, alertsGenerated: 0, error: msg };
  }
}

/**
 * Build the SEO dashboard data for the admin UI.
 * Uses db.ts exports for all database operations.
 */
export async function getSeoDashboard(): Promise<SeoDashboardData> {
  // Get latest 30 days of search analytics
  const metrics = await db.getSeoMetrics("search_analytics", 30);

  // Get unacknowledged alerts
  const alerts = await db.getUnacknowledgedSeoAlerts(20);

  // Build trend data
  const trend = metrics.map((m: any) => {
    const d = m.data as SearchAnalyticsSummary;
    return {
      date: m.date,
      clicks: d?.totalClicks || 0,
      impressions: d?.totalImpressions || 0,
      ctr: d?.avgCtr || 0,
      position: d?.avgPosition || 0,
    };
  });

  // Latest day's full data
  const latest = metrics[0]?.data as SearchAnalyticsSummary | undefined;

  // Get sitemap status for indexed page count
  const sitemapMetrics = await db.getSeoMetrics("sitemap_status", 1);
  const sitemapData = sitemapMetrics[0]?.data as SitemapStatus[] | undefined;
  const indexedPages =
    sitemapData?.reduce(
      (sum: number, s: SitemapStatus) =>
        sum + s.contents.reduce((cs, c) => cs + (c.indexed || 0), 0),
      0
    ) || 0;

  return {
    latestMetrics: latest
      ? {
          date: latest.date,
          clicks: latest.totalClicks,
          impressions: latest.totalImpressions,
          ctr: latest.avgCtr,
          position: latest.avgPosition,
          indexedPages,
        }
      : null,
    trend: trend.reverse(), // oldest first for charts
    alerts,
    topKeywords: latest?.topQueries || [],
    topPages: latest?.topPages || [],
  };
}
