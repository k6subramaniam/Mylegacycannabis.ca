/**
 * Shared Gmail OAuth2 Client — with circuit-breaker resilience
 *
 * When a refresh token expires or is revoked, Google returns `invalid_grant`.
 * Instead of dumping a massive stack trace every 5 minutes, this module:
 *  1. Detects the error on the first attempt
 *  2. Logs a single, clear warning with remediation steps
 *  3. Disables further Gmail API calls until the server is restarted
 *     (with a fresh GMAIL_REFRESH_TOKEN environment variable)
 *
 * Both etransferService.ts and trackingService.ts use this module.
 */

import { google } from "googleapis";

// ─── CONFIG (read once at module load) ───
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || "";

// ─── CIRCUIT-BREAKER STATE ───
let _oauthDisabled = false;
let _disabledReason = "";
let _disabledAt: Date | null = null;
let _failureCount = 0;

/** Maximum number of consecutive OAuth failures before the circuit trips */
const MAX_FAILURES = 2;

// ─── PUBLIC API ───

/** True if Gmail API credentials are present in the environment */
export function isGmailConfigured(): boolean {
  return !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
}

/** True if the circuit-breaker has tripped (token expired / revoked) */
export function isGmailDisabled(): boolean {
  return _oauthDisabled;
}

/** Human-readable status for admin dashboards or /api/health */
export function getGmailStatus(): {
  configured: boolean;
  disabled: boolean;
  reason: string;
  disabledAt: string | null;
  failureCount: number;
} {
  return {
    configured: isGmailConfigured(),
    disabled: _oauthDisabled,
    reason: _disabledReason,
    disabledAt: _disabledAt?.toISOString() || null,
    failureCount: _failureCount,
  };
}

/**
 * Create a gmail client. Returns `null` if credentials are missing
 * or the circuit-breaker has tripped.
 */
export function getGmailClient(service: string): ReturnType<typeof google.gmail> | null {
  if (!isGmailConfigured()) {
    return null;
  }

  if (_oauthDisabled) {
    // Already logged the warning — stay silent on subsequent calls
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Call this from a catch block when a Gmail API call fails.
 * Returns `true` if the error is an OAuth / auth failure (should stop retrying).
 * Returns `false` if it's a transient error (safe to retry next cycle).
 */
export function handleGmailError(service: string, err: unknown): boolean {
  const errAny = err as any;

  // ─── Detect OAuth token failures ───
  const isInvalidGrant =
    errAny?.code === 400 &&
    (errAny?.response?.data?.error === "invalid_grant" ||
      errAny?.message?.includes?.("invalid_grant"));

  const isAuthError =
    isInvalidGrant ||
    errAny?.code === 401 ||
    errAny?.response?.data?.error === "invalid_client" ||
    errAny?.message?.includes?.("invalid_client");

  if (isAuthError) {
    _failureCount++;

    if (_failureCount >= MAX_FAILURES && !_oauthDisabled) {
      // Trip the circuit-breaker
      _oauthDisabled = true;
      _disabledAt = new Date();
      _disabledReason = errAny?.response?.data?.error_description
        || errAny?.response?.data?.error
        || errAny?.message
        || "Unknown OAuth error";

      console.error(
        `\n` +
        `┌──────────────────────────────────────────────────────────────────┐\n` +
        `│  ⚠️  [${service}] Gmail OAuth DISABLED — token expired/revoked  │\n` +
        `├──────────────────────────────────────────────────────────────────┤\n` +
        `│  Reason: ${_disabledReason.substring(0, 52).padEnd(52)} │\n` +
        `│  Time:   ${_disabledAt.toISOString().padEnd(52)} │\n` +
        `│                                                                  │\n` +
        `│  TO FIX:                                                         │\n` +
        `│  1. Re-authorize Gmail OAuth (run OAuth flow)                    │\n` +
        `│  2. Update GMAIL_REFRESH_TOKEN in Railway env vars               │\n` +
        `│  3. Redeploy (or restart the service)                            │\n` +
        `│                                                                  │\n` +
        `│  Gmail polling is paused until the token is refreshed.           │\n` +
        `│  The website and all other services continue to work normally.   │\n` +
        `└──────────────────────────────────────────────────────────────────┘\n`
      );
    } else if (!_oauthDisabled) {
      // First failure — brief warning, will retry once more
      console.warn(`[${service}] Gmail OAuth error (attempt ${_failureCount}/${MAX_FAILURES}): ${errAny?.response?.data?.error || errAny?.message || "unknown"}`);
    }
    // Once disabled, don't log anything — caller gets null from getGmailClient()

    return true; // auth error — stop processing this cycle
  }

  // ─── Transient / rate-limit errors → log briefly, allow retry ───
  _failureCount = 0; // reset on non-auth errors

  const code = errAny?.code || errAny?.response?.status || "unknown";
  const msg = errAny?.message || String(err);

  // Rate limit
  if (code === 429) {
    console.warn(`[${service}] Gmail rate limit hit — will retry next cycle`);
    return false;
  }

  // Network / timeout
  if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("ENOTFOUND")) {
    console.warn(`[${service}] Gmail network error (${code}) — will retry next cycle`);
    return false;
  }

  // Other API errors — log one line, not the whole object
  console.warn(`[${service}] Gmail API error (${code}): ${msg.substring(0, 200)}`);
  return false;
}

/**
 * Reset the circuit-breaker (e.g. after deploying a new token).
 * Callable from an admin endpoint if needed.
 */
export function resetGmailCircuitBreaker(): void {
  _oauthDisabled = false;
  _disabledReason = "";
  _disabledAt = null;
  _failureCount = 0;
  console.log("[Gmail] Circuit-breaker reset — OAuth polling will resume");
}
