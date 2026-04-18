/**
 * Email Health Monitor — tracks delivery, detects outages, tests providers.
 *
 * Three sub-features exposed in Admin Settings:
 *   1. Dashboard  — real-time stats (sent/failed/rate), uptime %, current status
 *   2. Event Log  — rolling window of recent email events (last 200)
 *   3. Provider Test — live ping to Resend / SMTP / SendGrid / Mailgun / SES
 *
 * All data is held in-memory (survives hot-reloads, resets on full restart).
 * No extra DB tables needed — lightweight and zero-config.
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import dns from "node:dns/promises";
import { ENV } from "./_core/env";

// ─── Logo URL helper ───
function getLogoUrlFallback(): string {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/logo.png`;
  return `${process.env.SITE_URL || "https://mylegacycannabisca-production.up.railway.app"}/logo.png`;
}

async function getLogoUrl(): Promise<string> {
  try {
    const { getSiteSetting } = await import("./db");
    const siteLogoUrl = await getSiteSetting("site_logo_url");
    if (siteLogoUrl) return siteLogoUrl;
    const emailLogoUrl = await getSiteSetting("email_logo_url");
    if (emailLogoUrl) return emailLogoUrl;
  } catch {}
  return getLogoUrlFallback();
}

// ─── Types ───

export type EmailProvider = "resend" | "smtp" | "sendgrid" | "mailgun" | "ses" | "unknown";

export interface EmailEvent {
  id: string;
  timestamp: string;        // ISO-8601
  provider: EmailProvider;
  to: string;
  subject: string;
  status: "sent" | "failed" | "bounced";
  error?: string;
  latencyMs: number;
}

export interface HealthSnapshot {
  status: "healthy" | "degraded" | "down";
  activeProvider: EmailProvider | "none";
  uptime: {
    last1h: number;         // success rate 0–100
    last24h: number;
    allTime: number;
  };
  totals: {
    sent: number;
    failed: number;
    bounced: number;
  };
  recentFailStreak: number; // consecutive failures from most recent
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureError: string | null;
  monitoringSince: string;  // ISO-8601 when monitor started
  warnings: string[];       // actionable warnings for the admin
}

export interface PingResult {
  provider: string;
  reachable: boolean;
  latencyMs: number;
  details: string;
  testedAt: string;
}

// ─── Event Store (in-memory, rolling window) ───

const MAX_EVENTS = 200;
const events: EmailEvent[] = [];
const monitoringSince = new Date().toISOString();
let eventCounter = 0;

/** Record an email event — called from emailService.ts after every send attempt */
export function recordEmailEvent(event: Omit<EmailEvent, "id">): void {
  eventCounter++;
  const entry: EmailEvent = {
    ...event,
    id: `evt_${Date.now()}_${eventCounter}`,
  };
  events.unshift(entry); // newest first
  if (events.length > MAX_EVENTS) events.pop();
}

// ─── Dashboard ───

export function getHealthDashboard(): HealthSnapshot {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const total = events.length;
  const sent = events.filter(e => e.status === "sent").length;
  const failed = events.filter(e => e.status === "failed").length;
  const bounced = events.filter(e => e.status === "bounced").length;

  // Calculate success rates
  const calcRate = (cutoff: number): number => {
    const filtered = events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    if (filtered.length === 0) return 100; // no data = assume healthy
    const s = filtered.filter(e => e.status === "sent").length;
    return Math.round((s / filtered.length) * 100);
  };

  const last1h = calcRate(oneHourAgo);
  const last24h = calcRate(twentyFourHoursAgo);
  const allTime = total > 0 ? Math.round((sent / total) * 100) : 100;

  // Consecutive failure streak (from most recent)
  let recentFailStreak = 0;
  for (const e of events) {
    if (e.status === "failed" || e.status === "bounced") recentFailStreak++;
    else break;
  }

  // Last success / failure
  const lastSuccess = events.find(e => e.status === "sent");
  const lastFailure = events.find(e => e.status === "failed" || e.status === "bounced");

  // Status determination
  let status: "healthy" | "degraded" | "down" = "healthy";
  if (recentFailStreak >= 5) status = "down";
  else if (recentFailStreak >= 2 || last1h < 80) status = "degraded";

  // Active provider
  let activeProvider: EmailProvider | "none" = "none";
  if (ENV.resendApiKey) activeProvider = "resend";
  else if (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass) activeProvider = "smtp";

  // Actionable warnings
  const warnings: string[] = [];

  // Detect Resend domain restriction from recent failures
  const domainError = events.find(e =>
    e.status === "failed" && e.error?.includes("can only send testing emails to your own email")
  );
  if (domainError) {
    warnings.push(
      `Resend free tier: can only send to ${ENV.adminEmail || "your account email"}. ` +
      `Verify a custom domain at resend.com/domains to send to any recipient (e.g. customers).`
    );
  }

  // SMTP port blocked
  const smtpBlockedError = events.find(e =>
    e.status === "failed" && e.provider === "smtp" &&
    (e.error?.includes("ENETUNREACH") || e.error?.includes("Connection timeout"))
  );
  if (smtpBlockedError) {
    warnings.push(
      "SMTP port 587 is blocked on Railway Hobby plan. SMTP fallback will not work. " +
      "Use Resend as primary provider or upgrade to Railway Pro."
    );
  }

  return {
    status,
    activeProvider,
    uptime: { last1h, last24h, allTime },
    totals: { sent, failed, bounced },
    recentFailStreak,
    lastSuccessAt: lastSuccess?.timestamp ?? null,
    lastFailureAt: lastFailure?.timestamp ?? null,
    lastFailureError: lastFailure?.error ?? null,
    monitoringSince,
    warnings,
  };
}

// ─── Event Log ───

export function getEmailEvents(opts: {
  page?: number;
  limit?: number;
  status?: "sent" | "failed" | "bounced";
}): { data: EmailEvent[]; total: number; page: number; pages: number } {
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 25, 50);

  let filtered = events;
  if (opts.status) filtered = filtered.filter(e => e.status === opts.status);

  const total = filtered.length;
  const pages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return { data, total, page, pages };
}

// ─── Provider Ping / Test ───

/**
 * Test connectivity to a specific email provider.
 * Supports: resend, smtp, sendgrid, mailgun, ses
 * Does NOT send a real email — only tests reachability.
 */
export async function pingProvider(provider: string): Promise<PingResult> {
  const start = Date.now();
  const result: PingResult = {
    provider,
    reachable: false,
    latencyMs: 0,
    details: "",
    testedAt: new Date().toISOString(),
  };

  try {
    switch (provider) {
      case "resend": {
        if (!ENV.resendApiKey) {
          result.details = "RESEND_API_KEY not configured";
          break;
        }
        // Ping Resend API — fetch domains endpoint to verify key + check domain status
        const res = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: { Authorization: `Bearer ${ENV.resendApiKey}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          result.reachable = true;
          const data = await res.json() as any;
          const domains = data?.data || [];
          const verified = domains.filter((d: any) => d.status === "verified");
          if (domains.length === 0) {
            result.details = `API key valid. No custom domains — using onboarding@resend.dev (can only send to ${ENV.adminEmail || "your own email"}). Add a domain at resend.com/domains to send to any recipient.`;
          } else if (verified.length > 0) {
            result.details = `API key valid. ${verified.length} verified domain(s): ${verified.map((d: any) => d.name).join(", ")}. Can send to any recipient.`;
          } else {
            result.details = `API key valid. ${domains.length} domain(s) pending verification. Currently can only send to ${ENV.adminEmail || "your own email"}.`;
          }
        } else {
          // Even non-200 means API is reachable (network works)
          result.reachable = res.status !== 500 && res.status !== 502 && res.status !== 503;
          result.details = `API responded with ${res.status}. ${result.reachable ? "Network OK but check RESEND_API_KEY permissions." : "Resend may be experiencing an outage."}`;
        }
        break;
      }

      case "smtp": {
        if (!ENV.smtpHost) {
          result.details = "SMTP_HOST not configured";
          break;
        }
        // DNS lookup first
        const addresses = await dns.resolve4(ENV.smtpHost).catch(() => []);
        if (addresses.length === 0) {
          result.details = `DNS resolution failed for ${ENV.smtpHost}`;
          break;
        }
        // Try socket connection to SMTP port
        const net = await import("node:net");
        const connected = await new Promise<boolean>((resolve) => {
          const sock = net.createConnection(
            { host: addresses[0], port: ENV.smtpPort, timeout: 8_000 },
            () => { sock.destroy(); resolve(true); }
          );
          sock.on("error", () => { sock.destroy(); resolve(false); });
          sock.on("timeout", () => { sock.destroy(); resolve(false); });
        });
        result.reachable = connected;
        result.details = connected
          ? `Connected to ${ENV.smtpHost}:${ENV.smtpPort} (${addresses[0]})`
          : `Cannot reach ${ENV.smtpHost}:${ENV.smtpPort} — port may be blocked (Railway Hobby blocks 587)`;
        break;
      }

      case "sendgrid": {
        const key = process.env.SENDGRID_API_KEY;
        if (!key) {
          result.details = "SENDGRID_API_KEY not configured";
          break;
        }
        const res = await fetch("https://api.sendgrid.com/v3/scopes", {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10_000),
        });
        result.reachable = res.ok;
        result.details = res.ok
          ? `SendGrid API reachable (${res.status})`
          : `SendGrid responded with status ${res.status}`;
        break;
      }

      case "mailgun": {
        const key = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        if (!key || !domain) {
          result.details = "MAILGUN_API_KEY or MAILGUN_DOMAIN not configured";
          break;
        }
        const res = await fetch(`https://api.mailgun.net/v3/${domain}/stats/total?event=accepted&duration=1h`, {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}`,
          },
          signal: AbortSignal.timeout(10_000),
        });
        result.reachable = res.ok;
        result.details = res.ok
          ? `Mailgun API reachable for domain ${domain} (${res.status})`
          : `Mailgun responded with status ${res.status}`;
        break;
      }

      case "ses": {
        // Test SES via DNS resolution of the regional endpoint
        const region = process.env.AWS_REGION || "us-east-1";
        const sesHost = `email.${region}.amazonaws.com`;
        const addresses = await dns.resolve4(sesHost).catch(() => []);
        result.reachable = addresses.length > 0;
        result.details = result.reachable
          ? `SES endpoint ${sesHost} resolved to ${addresses[0]}`
          : `Cannot resolve SES endpoint ${sesHost}`;
        break;
      }

      default:
        result.details = `Unknown provider: ${provider}. Supported: resend, smtp, sendgrid, mailgun, ses`;
    }
  } catch (err: any) {
    result.details = `Error: ${err.message}`;
  }

  result.latencyMs = Date.now() - start;
  return result;
}

/**
 * Send a real test email to verify end-to-end delivery.
 * Returns delivery result with timing.
 */
export async function sendTestEmail(to: string): Promise<{
  success: boolean;
  provider: EmailProvider;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  const subject = `[Test] My Legacy Cannabis — Email Health Check (${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })})`;
  const resolvedLogo = await getLogoUrl();
  const html = `
    <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="background-color: #3A2270; padding: 20px; text-align: center;">
        <img src="${resolvedLogo}" alt="My Legacy Cannabis" style="max-width: 180px; height: auto;" />
      </div>
      <div style="height: 5px; background: linear-gradient(90deg, #F5C518 0%, #F19929 35%, #E8792B 65%, #C42B2B 100%);"></div>
      <div style="background: #4CAF50; color: white; padding: 16px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">Email Health Check Passed</h2>
      </div>
      <div style="padding: 24px;">
        <p style="color: #323233; text-align: center; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          This is a test email from the Email Health Monitor.
          If you're reading this, your email delivery is working correctly.
        </p>
        <div style="background: #F5F5F5; border-radius: 8px; padding: 14px 16px;">
          <p style="color: #858481; font-size: 12px; margin: 0;">
            Sent at: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })} ET<br/>
            Provider: ${ENV.resendApiKey ? "Resend" : ENV.smtpHost ? "SMTP" : "None"}
          </p>
        </div>
      </div>
      <div style="background-color: #3A2270; padding: 14px; text-align: center;">
        <p style="color: #999; font-size: 11px; margin: 0;">
          MyLegacy Cannabis &middot; Admin Email Health Monitor
        </p>
      </div>
    </div>
  `;

  // Import the core sendMail dynamically to avoid circular deps
  const { sendMailTracked } = await import("./emailService");

  try {
    const result = await sendMailTracked({ to, subject, html });
    return {
      success: result.success,
      provider: result.provider,
      latencyMs: Date.now() - start,
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: ENV.resendApiKey ? "resend" : "unknown",
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

/** Get all available provider names (configured or not) for the UI test panel */
export function getAvailableProviders(): Array<{
  name: string;
  configured: boolean;
  envKeys: string[];
  warning?: string;
}> {
  return [
    {
      name: "resend",
      configured: !!ENV.resendApiKey,
      envKeys: ["RESEND_API_KEY"],
      warning: ENV.resendApiKey
        ? "Free tier: can only send to your own email. Add a verified domain at resend.com/domains to send to customers."
        : undefined,
    },
    {
      name: "smtp",
      configured: !!(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass),
      envKeys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
      warning: (ENV.smtpHost && ENV.smtpUser && !ENV.smtpPass)
        ? "SMTP_PASS is missing. SMTP transport will not work."
        : (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass)
          ? "Railway Hobby plan blocks SMTP ports 465/587. SMTP only works on Railway Pro or local dev."
          : undefined,
    },
    {
      name: "sendgrid",
      configured: !!process.env.SENDGRID_API_KEY,
      envKeys: ["SENDGRID_API_KEY"],
    },
    {
      name: "mailgun",
      configured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
      envKeys: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"],
    },
    {
      name: "ses",
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      envKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    },
  ];
}
