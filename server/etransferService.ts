/**
 * E-Transfer Auto-Matching Service
 *
 * Polls a Gmail inbox for Interac e-Transfer deposit notifications,
 * parses sender / amount / memo, and matches them to pending orders.
 *
 * Supports all major Canadian bank notification formats (TD, RBC, BMO,
 * Scotiabank, CIBC, Desjardins, National Bank, etc.) with auto-deposit.
 *
 * Environment variables required:
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REFRESH_TOKEN
 *   GMAIL_PAYMENT_EMAIL     (the inbox address, e.g. payments@mylegacycannabis.ca)
 */

import { google } from "googleapis";
import * as db from "./db";

// ─── CONFIG ───
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || "";
const GMAIL_PAYMENT_EMAIL = process.env.GMAIL_PAYMENT_EMAIL || "";

const PROCESSED_LABEL = "etransfer-processed";

// ─── GMAIL AUTH ───
function getGmailClient() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error("[ETransfer] Missing Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)");
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// ─── ENSURE LABEL EXISTS ───
async function ensureLabel(gmail: ReturnType<typeof google.gmail>) {
  try {
    const res = await gmail.users.labels.list({ userId: "me" });
    const labels = res.data.labels || [];
    const existing = labels.find(l => l.name === PROCESSED_LABEL);
    if (existing) return existing.id!;

    const created = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: PROCESSED_LABEL,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    });
    return created.data.id!;
  } catch (err) {
    console.error("[ETransfer] Failed to create/get label:", err);
    return null;
  }
}

// ─── TYPES ───
export interface ParsedETransfer {
  senderName: string;
  senderEmail: string;
  amount: number | null;
  memo: string;
  subject: string;
  bodySnippet: string;
  receivedAt: Date;
  emailId: string;
}

export interface MatchResult {
  orderId: number;
  orderNumber: string;
  confidence: "exact" | "high" | "low" | "none";
  method: string;
}

// ─── EMAIL PARSER ───
// Handles various Canadian bank Interac e-Transfer notification formats

/**
 * FALLBACK patterns that identify an Interac e-Transfer deposit notification.
 * Used when no admin-configured keyword rules exist.
 */
const DEFAULT_ETRANSFER_INDICATORS = [
  /interac\s*e[\-\s]?transfer/i,
  /e[\-\s]?transfer.*deposit/i,
  /has been automatically deposited/i,
  /you.ve received.*money/i,
  /received.*interac/i,
  /virement\s*interac/i,           // French (Desjardins, National Bank)
  /a été automatiquement déposé/i,  // French auto-deposit
];

/** Exported for the test endpoint in routers.ts */
export const DEFAULT_ETRANSFER_INDICATORS_FOR_TEST = DEFAULT_ETRANSFER_INDICATORS;

// ─── ADMIN-CONFIGURABLE KEYWORD RULES ───
// Stored in site_settings under key "etransfer_keyword_rules"
// Format: Array of rule groups. Each group has an operator (AND/OR) and keywords[].
// Groups are evaluated with OR between them (any group match = e-Transfer).
// Within a group: AND means all keywords must be present, OR means any keyword.

export interface KeywordRule {
  id: string;
  name: string;              // Human-readable rule name, e.g. "Interac auto-deposit"
  operator: "AND" | "OR";    // How keywords within this rule combine
  keywords: string[];        // Case-insensitive keyword/phrases
  enabled: boolean;
}

/** In-memory cache for keyword rules to avoid DB hits on every email */
let _cachedRules: KeywordRule[] | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getKeywordRules(): Promise<KeywordRule[]> {
  const now = Date.now();
  if (_cachedRules !== null && now < _cacheExpiry) return _cachedRules;

  try {
    const raw = await db.getSiteSetting("etransfer_keyword_rules");
    if (raw) {
      _cachedRules = JSON.parse(raw) as KeywordRule[];
    } else {
      _cachedRules = [];
    }
  } catch {
    _cachedRules = [];
  }
  _cacheExpiry = now + CACHE_TTL_MS;
  return _cachedRules;
}

export function clearKeywordRulesCache(): void {
  _cachedRules = null;
  _cacheExpiry = 0;
}

/**
 * Evaluate a single keyword rule against combined email text.
 * Returns true if the rule matches.
 */
function evaluateRule(rule: KeywordRule, text: string): boolean {
  if (!rule.enabled || rule.keywords.length === 0) return false;
  const lower = text.toLowerCase();

  if (rule.operator === "AND") {
    return rule.keywords.every(kw => lower.includes(kw.toLowerCase()));
  } else {
    // OR
    return rule.keywords.some(kw => lower.includes(kw.toLowerCase()));
  }
}

/**
 * Check if email text matches admin-configured keyword rules.
 * Rules are combined with OR (any rule match = true).
 * Falls back to hardcoded regex patterns if no rules are configured.
 */
async function matchesKeywordRules(subject: string, body: string): Promise<boolean> {
  const rules = await getKeywordRules();
  const enabledRules = rules.filter(r => r.enabled);

  if (enabledRules.length === 0) {
    // No admin rules → use defaults
    return false; // signals caller to fall back
  }

  const combined = `${subject} ${body}`;
  return enabledRules.some(rule => evaluateRule(rule, combined));
}

/**
 * Extract sender name from various bank formats:
 * - "John Smith sent you money"
 * - "You've received an INTERAC e-Transfer from John Smith"
 * - "e-Transfer from John Smith has been automatically deposited"
 * - "INTERAC e-Transfer: John Smith sent you $X"
 */
const SENDER_PATTERNS = [
  /(?:from|de)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:has been|a été)/i,
  /(?:from|de)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+sent you/i,
  /e[\-\s]?Transfer:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  /virement.*?de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
];

/**
 * Extract dollar amount from body/subject.
 */
const AMOUNT_PATTERNS = [
  /\$\s*([\d,]+\.?\d{0,2})/,
  /([\d,]+\.?\d{0,2})\s*(?:CAD|dollars?)/i,
  /montant.*?([\d,]+\.?\d{0,2})/i,
];

/**
 * Extract the memo / message field that the customer included.
 */
const MEMO_PATTERNS = [
  /(?:message|memo|note|reference|remarque|commentaire)\s*[:：]\s*(.+?)(?:\n|$)/i,
  /(?:included this message|a inclus ce message)\s*[:：]?\s*(.+?)(?:\n|$)/i,
];

/**
 * Extract order number (ML-xxx or MLC-xxx or ORD-xxx format).
 */
const ORDER_NUMBER_PATTERNS = [
  /\b(ML-[A-Z0-9\-]{4,})\b/i,
  /\b(MLC-\d+)\b/i,
  /\b(ORD-[\d\-]+)\b/i,
];

function isETransferEmailSync(subject: string, body: string): boolean {
  const combined = `${subject} ${body}`;
  return DEFAULT_ETRANSFER_INDICATORS.some(p => p.test(combined));
}

/**
 * Async version: checks admin keyword rules first, then falls back to defaults.
 */
async function isETransferEmail(subject: string, body: string): Promise<boolean> {
  // Try admin-configured rules first
  const rulesMatch = await matchesKeywordRules(subject, body);
  if (rulesMatch) return true;

  // Check if admin has rules configured (even if none matched)
  const rules = await getKeywordRules();
  const hasEnabledRules = rules.some(r => r.enabled);

  // If admin has configured rules but none matched, still check defaults
  // (admin rules are additive, not a replacement — ensures backwards compat)
  return isETransferEmailSync(subject, body);
}

function extractSenderName(subject: string, body: string): string {
  const combined = `${subject}\n${body}`;
  for (const pattern of SENDER_PATTERNS) {
    const m = combined.match(pattern);
    if (m && m[1]) {
      const name = m[1].trim();
      // Avoid matching bank names or generic words
      if (name.length > 2 && !/^(interac|the|your|this|bank|from)$/i.test(name)) {
        return name;
      }
    }
  }
  return "";
}

function extractAmount(subject: string, body: string): number | null {
  const combined = `${subject}\n${body}`;
  for (const pattern of AMOUNT_PATTERNS) {
    const m = combined.match(pattern);
    if (m && m[1]) {
      const raw = m[1].replace(/,/g, "");
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

function extractMemo(body: string): string {
  for (const pattern of MEMO_PATTERNS) {
    const m = body.match(pattern);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

function extractOrderNumber(text: string): string | null {
  for (const pattern of ORDER_NUMBER_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1]) return m[1].toUpperCase();
  }
  return null;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getEmailBody(payload: any): string {
  // Simple single-part message
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — look for text/plain first, then text/html
  const parts = payload.parts || [];
  let textPart = "";
  let htmlPart = "";

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      textPart = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlPart = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      // Nested multipart
      for (const sub of part.parts) {
        if (sub.mimeType === "text/plain" && sub.body?.data) {
          textPart = decodeBase64Url(sub.body.data);
        } else if (sub.mimeType === "text/html" && sub.body?.data) {
          htmlPart = decodeBase64Url(sub.body.data);
        }
      }
    }
  }

  if (textPart) return textPart;
  if (htmlPart) return stripHtml(htmlPart);
  return "";
}

function getHeader(headers: any[], name: string): string {
  const h = headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

// ─── MATCHING ENGINE ───

function fuzzyNameMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  const a = name1.toLowerCase().trim();
  const b = name2.toLowerCase().trim();
  if (a === b) return true;

  // Check if one is a substring of the other
  if (a.includes(b) || b.includes(a)) return true;

  // Check if last names match
  const aLast = a.split(/\s+/).pop() || "";
  const bLast = b.split(/\s+/).pop() || "";
  if (aLast.length > 2 && bLast.length > 2 && aLast === bLast) return true;

  return false;
}

async function matchToOrder(parsed: ParsedETransfer): Promise<MatchResult | null> {
  const pendingOrders = await db.getPendingETransferOrders();
  if (pendingOrders.length === 0) return null;

  // ── Strategy 1: Order number in memo ──
  const orderNumFromMemo = extractOrderNumber(parsed.memo) || extractOrderNumber(parsed.bodySnippet);
  if (orderNumFromMemo) {
    const match = pendingOrders.find(o => o.orderNumber.toUpperCase() === orderNumFromMemo);
    if (match) {
      return { orderId: match.id, orderNumber: match.orderNumber, confidence: "exact", method: "memo_order_number" };
    }
  }

  if (parsed.amount === null) return null;

  // ── Strategy 2: Exact amount match (only 1 pending order with that amount) ──
  const amountMatches = pendingOrders.filter(o => {
    const orderTotal = parseFloat(o.total);
    return Math.abs(orderTotal - parsed.amount!) < 0.01;
  });

  if (amountMatches.length === 1) {
    return { orderId: amountMatches[0].id, orderNumber: amountMatches[0].orderNumber, confidence: "high", method: "exact_amount_unique" };
  }

  // ── Strategy 3: Amount + sender name match ──
  if (amountMatches.length > 1 && parsed.senderName) {
    for (const order of amountMatches) {
      const customerName = order.guestName || "";
      if (fuzzyNameMatch(parsed.senderName, customerName)) {
        return { orderId: order.id, orderNumber: order.orderNumber, confidence: "high", method: "amount_plus_name" };
      }
    }
    // Multiple amount matches but no name match → low confidence, pick first
    return { orderId: amountMatches[0].id, orderNumber: amountMatches[0].orderNumber, confidence: "low", method: "amount_multiple_matches" };
  }

  // ── Strategy 4: Name-only match (no amount match) ──
  if (parsed.senderName) {
    const nameMatches = pendingOrders.filter(o => fuzzyNameMatch(parsed.senderName, o.guestName || ""));
    if (nameMatches.length === 1) {
      return { orderId: nameMatches[0].id, orderNumber: nameMatches[0].orderNumber, confidence: "low", method: "name_only" };
    }
  }

  return null;
}

// ─── MAIN POLL FUNCTION ───

export async function pollETransferEmails(): Promise<{ processed: number; matched: number; errors: number }> {
  const stats = { processed: 0, matched: 0, errors: 0 };

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    console.log("[ETransfer] Gmail API not configured — skipping poll");
    return stats;
  }

  try {
    const gmail = getGmailClient();
    const labelId = await ensureLabel(gmail);

    // Search for Interac-related emails not yet labelled as processed
    // The query uses Gmail search operators
    const query = `(interac OR e-transfer OR "e transfer" OR "virement interac") -label:${PROCESSED_LABEL} newer_than:7d`;

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      console.log("[ETransfer] No new e-Transfer emails found");
      return stats;
    }

    console.log(`[ETransfer] Found ${messages.length} potential e-Transfer email(s)`);

    for (const msg of messages) {
      try {
        const emailId = msg.id!;

        // Check if already processed in our DB
        const existing = await db.getPaymentRecordByEmailId(emailId);
        if (existing) {
          // Mark as processed in Gmail and skip
          if (labelId) {
            await gmail.users.messages.modify({ userId: "me", id: emailId, requestBody: { addLabelIds: [labelId] } }).catch(() => {});
          }
          continue;
        }

        // Fetch full message
        const msgRes = await gmail.users.messages.get({ userId: "me", id: emailId, format: "full" });
        const payload = msgRes.data.payload;
        if (!payload) continue;

        const headers = payload.headers || [];
        const subject = getHeader(headers, "Subject");
        const from = getHeader(headers, "From");
        const dateStr = getHeader(headers, "Date");
        const body = getEmailBody(payload);

        // Check if this is actually an e-Transfer email (uses admin keyword rules + defaults)
        if (!(await isETransferEmail(subject, body))) {
          // Not an e-Transfer — label it and skip
          if (labelId) {
            await gmail.users.messages.modify({ userId: "me", id: emailId, requestBody: { addLabelIds: [labelId] } }).catch(() => {});
          }
          continue;
        }

        // Parse the email
        const parsed: ParsedETransfer = {
          senderName: extractSenderName(subject, body),
          senderEmail: from,
          amount: extractAmount(subject, body),
          memo: extractMemo(body),
          subject,
          bodySnippet: body.substring(0, 500),
          receivedAt: dateStr ? new Date(dateStr) : new Date(),
          emailId,
        };

        console.log(`[ETransfer] Parsed: sender="${parsed.senderName}" amount=$${parsed.amount} memo="${parsed.memo}"`);

        // Try to match
        const match = await matchToOrder(parsed);

        // Save the payment record
        const record: any = {
          emailId: parsed.emailId,
          senderName: parsed.senderName || null,
          senderEmail: parsed.senderEmail || null,
          amount: parsed.amount?.toFixed(2) || null,
          memo: parsed.memo || null,
          rawSubject: parsed.subject?.substring(0, 500) || null,
          rawBodySnippet: parsed.bodySnippet || null,
          receivedAt: parsed.receivedAt,
          matchedOrderId: match?.orderId || null,
          matchedOrderNumber: match?.orderNumber || null,
          matchConfidence: match?.confidence || "none",
          matchMethod: match?.method || null,
          status: match && (match.confidence === "exact" || match.confidence === "high") ? "auto_matched" : "unmatched",
        };

        // If auto-matched, update the order's payment status
        if (match && (match.confidence === "exact" || match.confidence === "high")) {
          // ─── 1:1 CARDINALITY GUARD: prevent double-matching ───
          const alreadyMatched = await db.isOrderAlreadyMatched(match.orderId);
          if (alreadyMatched) {
            console.warn(`[ETransfer] ⚠️ Order ${match.orderNumber} already has a matched payment — treating as unmatched`);
            record.status = "unmatched";
            record.matchConfidence = "none";
            record.matchedOrderId = null;
            record.matchedOrderNumber = null;
            await db.createPaymentRecord(record);
            stats.processed++;
          } else {
            await db.createPaymentRecord(record);
            stats.processed++;

            // ─── LOW-VALUE AUTO-CONFIRM ───
            // If high confidence + exact amount + < $200: auto-promote to Payment: Confirmed AND Order: Confirmed
            const orderTotal = parsed.amount || 0;
            const isExactAmount = match.method.includes("amount") || match.method === "memo_order_number";
            if ((match.confidence === "exact" || match.confidence === "high") && isExactAmount && orderTotal < 200) {
              await db.updateOrder(match.orderId, { paymentStatus: "confirmed", status: "confirmed" } as any);
              console.log(`[ETransfer] ✅ Auto-confirmed (low value $${orderTotal} < $200) → order ${match.orderNumber} payment: confirmed, status: confirmed`);
            } else {
              await db.updateOrder(match.orderId, { paymentStatus: "received" } as any);
              console.log(`[ETransfer] ✅ Auto-matched $${parsed.amount} → order ${match.orderNumber} (${match.method}) — payment: received (admin review needed)`);
            }

            stats.matched++;

            // Trigger payment confirmation email (fire-and-forget)
            try {
              await sendPaymentReceivedNotification(match.orderId, match.orderNumber, parsed.amount || 0);
            } catch (emailErr) {
              console.warn("[ETransfer] Failed to send payment confirmation email:", emailErr);
            }
          }
        } else {
          await db.createPaymentRecord(record);
          stats.processed++;
          console.log(`[ETransfer] ⚠️ Unmatched: $${parsed.amount} from "${parsed.senderName}" memo="${parsed.memo}"`);
        }

        // Label as processed in Gmail
        if (labelId) {
          await gmail.users.messages.modify({ userId: "me", id: emailId, requestBody: { addLabelIds: [labelId] } }).catch(() => {});
        }

      } catch (msgErr) {
        console.error(`[ETransfer] Error processing message ${msg.id}:`, msgErr);
        stats.errors++;
      }
    }

  } catch (err) {
    console.error("[ETransfer] Poll error:", err);
    stats.errors++;
  }

  console.log(`[ETransfer] Poll complete: ${stats.processed} processed, ${stats.matched} matched, ${stats.errors} errors`);
  return stats;
}

// ─── MANUAL MATCH (admin) ───

export async function manualMatchPayment(paymentId: number, orderId: number, adminId: number): Promise<boolean> {
  try {
    // ─── 1:1 CARDINALITY GUARD ───
    const alreadyMatched = await db.isOrderAlreadyMatched(orderId);
    if (alreadyMatched) {
      console.warn(`[ETransfer] Cannot manual-match: order ${orderId} already has a linked payment`);
      return false;
    }

    await db.updatePaymentRecord(paymentId, {
      matchedOrderId: orderId,
      status: "manual_matched" as any,
      matchConfidence: "exact" as any,
      matchMethod: "manual_admin",
      reviewedBy: adminId,
      reviewedAt: new Date(),
    } as any);

    // Update order payment status
    await db.updateOrder(orderId, { paymentStatus: "received" } as any);

    console.log(`[ETransfer] Admin ${adminId} manually matched payment ${paymentId} → order ${orderId}`);
    return true;
  } catch (err) {
    console.error("[ETransfer] Manual match error:", err);
    return false;
  }
}

// ─── PAYMENT CONFIRMATION EMAIL ───

async function sendPaymentReceivedNotification(orderId: number, orderNumber: string, amount: number): Promise<void> {
  try {
    const { triggerPaymentReceived } = await import("./emailTemplateEngine");
    const orderData = await db.getOrderById(orderId);
    if (!orderData) return;

    const customerEmail = orderData.guestEmail;
    const customerName = orderData.guestName || "Customer";
    if (!customerEmail) return;

    await triggerPaymentReceived({
      customerName,
      customerEmail,
      orderId: orderNumber,
      orderTotal: parseFloat(orderData.total).toFixed(2),
    });

    console.log(`[ETransfer] Payment confirmation sent to ${customerEmail} for order ${orderNumber}`);
  } catch (err) {
    console.warn("[ETransfer] Could not send payment confirmation:", (err as Error).message);
  }
}

// ─── STATUS CHECK ───

export function isETransferServiceConfigured(): boolean {
  return !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
}
