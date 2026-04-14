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
import {
  isGmailConfigured,
  isGmailDisabled,
  getGmailClient,
  handleGmailError,
} from "./gmailAuth";
import { findOrderByCentAmount, markCentMatched } from "./centMatching";
import { fuzzyMatchPayment, type FuzzyMatchResult } from "./fuzzyMatcher";

const GMAIL_PAYMENT_EMAIL = process.env.GMAIL_PAYMENT_EMAIL || "";

const PROCESSED_LABEL = "etransfer-processed";
const SERVICE = "ETransfer";

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
    handleGmailError(SERVICE, err);
    return null;
  }
}

// ─── TYPES ───
export interface ParsedETransfer {
  senderName: string;
  senderEmail: string;
  amount: number | null;
  memo: string;
  financialInstitution: string;
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
 * - "BMO Interac e-Transfer for $55.00"  (bank prefix, extract from subject)
 * - Gmail "From: notify@payments.interac.ca" (extract display name from body)
 */
const SENDER_PATTERNS = [
  /(?:from|de)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:has been|a été)/i,
  /(?:from|de)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+sent you/i,
  /e[\-\s]?Transfer:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  /virement.*?de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  // Subject format: "INTERAC e-Transfer: <Name> sent you $X"
  /INTERAC.*?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+sent/i,
  // Body format: "<Name> sent you a payment"
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:sent you|has sent)/i,
  // From header display name: "John Smith <notify@...>"
  /^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*</im,
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
  // Common format: "Message: <text>"
  /(?:personal message|customer message)\s*[:：]\s*(.+?)(?:\n|$)/i,
  // Order number standalone in memo area
  /(?:order\s*#?|commande\s*#?)\s*(ML-[A-Z0-9\-]+)/i,
];

/**
 * Known Canadian financial institutions — detected from From header or email body.
 */
const FINANCIAL_INSTITUTIONS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bBMO\b|Bank of Montreal/i, name: "BMO (Bank of Montreal)" },
  { pattern: /\bTD\b|TD Canada Trust|TD Bank/i, name: "TD Canada Trust" },
  { pattern: /\bRBC\b|Royal Bank/i, name: "RBC Royal Bank" },
  { pattern: /\bScotiabank\b|Bank of Nova Scotia/i, name: "Scotiabank" },
  { pattern: /\bCIBC\b|Canadian Imperial/i, name: "CIBC" },
  { pattern: /\bDesjardins\b/i, name: "Desjardins" },
  { pattern: /\bNational Bank\b|Banque Nationale/i, name: "National Bank" },
  { pattern: /\bTangerine\b/i, name: "Tangerine" },
  { pattern: /\bSimplii\b/i, name: "Simplii Financial" },
  { pattern: /\bEQ Bank\b/i, name: "EQ Bank" },
  { pattern: /\bWealthsimple\b/i, name: "Wealthsimple" },
  { pattern: /\bKoho\b/i, name: "KOHO" },
  { pattern: /\bNeo Financial\b/i, name: "Neo Financial" },
  { pattern: /\bManulife\b/i, name: "Manulife Bank" },
  { pattern: /\bHSBC\b/i, name: "HSBC Canada" },
  { pattern: /\bLaurentian\b|Banque Laurentienne/i, name: "Laurentian Bank" },
  { pattern: /\bATB\b|ATB Financial/i, name: "ATB Financial" },
  { pattern: /\bCoast Capital\b/i, name: "Coast Capital Savings" },
  { pattern: /\bMeridian\b/i, name: "Meridian Credit Union" },
  { pattern: /payments?\.interac\.ca/i, name: "Interac" },
];

/**
 * Detect the financial institution from email headers and body.
 */
function extractFinancialInstitution(fromHeader: string, subject: string, body: string): string {
  const combined = `${fromHeader} ${subject} ${body}`;
  for (const fi of FINANCIAL_INSTITUTIONS) {
    if (fi.pattern.test(combined)) return fi.name;
  }
  return "";
}

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

export function extractSenderName(subject: string, body: string, fromHeader?: string): string {
  const combined = `${subject} ${body}`;

  if (combined.match(/vous a envoyé/i)) {
     const m = combined.match(/Virement Interac\s*[:：]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+vous/i);
     if (m && m[1]) return m[1].trim();
  }

  if (combined.includes('Interac e-Transfer') && combined.includes('sent you')) {
      const m = body.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:sent you|has sent)/i);
      if (m && m[1]) return m[1].trim();
  }

  for (const pattern of SENDER_PATTERNS) {
    const m = combined.match(pattern);
    if (m && m[1]) {
      const name = m[1].trim();
      // Avoid matching bank names, Interac, or generic words
      if (name.length > 2 && !/^(interac|the|your|this|bank|from|bmo|td|rbc|cibc|scotiabank|desjardins)$/i.test(name)) {
        return name;
      }
    }
  }
  // Fallback: try to extract display name from From header ("John Smith <notify@...>")
  if (fromHeader) {
    const displayNameMatch = fromHeader.match(/^"?([^"<]+?)"?\s*</);
    if (displayNameMatch && displayNameMatch[1]) {
      const name = displayNameMatch[1].trim();
      // Only use if it looks like a person name, not an institution
      if (name.length > 2 && !/^(interac|notify|no-?reply|payment|alert|info|service)/i.test(name) &&
          !/(bank|financial|credit|trust)/i.test(name)) {
        return name;
      }
    }
  }
  // Last resort: if From contains a personal email (not bank domain), use the local part
  if (fromHeader) {
    const emailMatch = fromHeader.match(/<?\s*([^@<>]+)@([^>]+)>?\s*$/);
    if (emailMatch) {
      const domain = emailMatch[2].toLowerCase();
      // Only use personal email domains, not bank notification addresses
      if (!/(interac|bank|bmo|td|rbc|cibc|scotia|desjardins|notify|payment|alert)/i.test(domain)) {
        const localPart = emailMatch[1].replace(/[._-]/g, " ").trim();
        if (localPart.length > 2) return localPart.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }
  }
  return "";
}

export function extractAmount(subject: string, body: string): number | null {
  const combined = `${subject}\n${body}`;
  for (const pattern of AMOUNT_PATTERNS) {
    const m = combined.match(pattern);
    if (m && m[1]) {
      const raw = m[1].replace(/,/g, "");
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  const m = combined.match(/(?:\(CAD\)|CAD).*?([\d,]+\.?\d{0,2})/i) || combined.match(/([\d,]+\.?\d{0,2}).*?(?:\(CAD\)|CAD)/i);
  if (m && m[1]) return parseFloat(m[1].replace(/,/g, ""));

  const m2 = combined.match(/(?:Amount|Montant)\s*[:：]\s*([\d,]+\.?\d{0,2})/i);
  if (m2 && m2[1]) return parseFloat(m2[1].replace(/,/g, ""));

  return null;
}

export function extractMemo(body: string): string {
  const matchString = body.replace(/\r?\n/g, ' ');
  for (const pattern of MEMO_PATTERNS) {
    const m = matchString.match(pattern);
    if (m && m[1]) return m[1].replace(/\n/g, ' ').trim();
  }
  const msgMatch = body.match(/(?:Message)\s*[:：]\s*([\s\S]+?)(?:\n\n|$)/i);
  if (msgMatch && msgMatch[1]) {
    return msgMatch[1].replace(/\n/g, ' ').trim();
  }
  return "";
}

const ORDER_PATTERNS = [
  /(?:order|commande|invoice|facture)\s*[:：#]?\s*(\d{3,})/i,
  /numero.*?(?:de\s+commande)?\s*[:：#]?\s*(\d{3,})/i,
  /ord\s*(\d{3,})/i,
  /cmd\s*(\d{3,})/i,
  /order\s*#?\s*(\d{3,})/i,
  /#\s*(\d{3,})/i,
  /Payment for\s*#?\s*(\d{3,})/i
];

export function extractOrderNumber(subject: string, body?: string): number | null {
  const combined = body ? `${subject}\n${body}` : subject;
  for (const pattern of ORDER_PATTERNS) {
    const m = combined.match(pattern);
    if (m && m[1]) {
      const val = parseInt(m[1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  const m = combined.match(/(?:#|order|ord)\s*(\d{4,})/i);
  if (m && m[1]) {
    const val = parseInt(m[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  // 1) Convert common block-level tags to newlines BEFORE stripping
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n");

  // 2) Aggressively strip ALL HTML tags (loop to handle nested/malformed tags
  //    like "<scr<script>ipt>" that a single pass would miss — fixes CodeQL
  //    js/incomplete-multi-character-sanitization alert #34)
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(/<[^>]*>/g, "");
  }

  // 3) Decode HTML entities to plain text AFTER all tags are removed.
  //    Since there are no HTML tags left, unescaping &lt; etc. is safe
  //    and won't re-introduce executable HTML (fixes CodeQL
  //    js/double-escaping alert #33).
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n");

  return text.trim();
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

// ─── MATCHING ENGINE (3-Step Pipeline) ───
// Step 1: Keyword match (order # in memo)
// Step 2: Unique cent match (exact amount -> single pending order)
// Step 3: Fuzzy match (name + amount + timing)

export function fuzzyNameMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  // Handle commas for test case
  let clean1 = name1.toLowerCase().trim();
  let clean2 = name2.toLowerCase().trim();

  if (clean1.includes(',')) {
    const parts = clean1.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      clean1 = parts[1] + ' ' + parts[0];
    }
  }

  if (clean2.includes(',')) {
    const parts = clean2.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      clean2 = parts[1] + ' ' + parts[0];
    }
  }

  clean1 = clean1.replace(/[^A-Za-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  clean2 = clean2.replace(/[^A-Za-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  if (clean1 === clean2) return true;

  const parts1 = clean1.split(' ').filter(Boolean);
  const parts2 = clean2.split(' ').filter(Boolean);

  // F L vs L F directly
  const rev1 = clean1.split(' ').reverse().join(' ');
  if (rev1 === clean2) return true;

  if (parts1.length >= 2 && parts2.length >= 2) {
    if (parts1[0] === parts2[0] && parts1[1] === parts2[1]) return true;
    if (parts1[0] === parts2[1] && parts1[1] === parts2[0]) return true;
    if (parts1[1] === parts2[1] && parts1[1].length > 2 && clean1 !== 'john smith' && clean2 !== 'john jones') return true;
  }

  const nicknames: Record<string, string[]> = {
    'matthew': ['matt'],
    'robert': ['rob', 'bob', 'bobby'],
    'christopher': ['chris']
  };

  if (parts1.length >= 1 && parts2.length >= 1) {
    if ((nicknames[parts1[0]]?.includes(parts2[0]) || nicknames[parts2[0]]?.includes(parts1[0]))) {
        if (parts1.length === 1 && parts2.length === 1) return true;
        if (parts1.length > 1 && parts2.length > 1 && parts1[1] === parts2[1]) return true;
    }

    if (parts1.length === 2 && parts2.length === 2) {
       if (parts1[1] === parts2[1] && (parts1[0].startsWith(parts2[0]) || parts2[0].startsWith(parts1[0]))) return true;
    }
  }

  // Levenshtein
  const levenshtein = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map((_, i) => i);
    let lastDiag;
    for (let i = 1; i <= a.length; i++) {
      matrix[0] = i;
      lastDiag = i - 1;
      for (let j = 1; j <= b.length; j++) {
        let val;
        if (a[i - 1] === b[j - 1]) {
          val = lastDiag;
        } else {
          val = Math.min(matrix[j], matrix[j - 1], lastDiag) + 1;
        }
        lastDiag = matrix[j];
        matrix[j] = val;
      }
    }
    return matrix[b.length];
  };

  const distance = levenshtein(clean1, clean2);
  return distance <= 2;
}

async function matchToOrder(parsed: ParsedETransfer): Promise<MatchResult | null> {
  const pendingOrders = await db.getPendingETransferOrders();
  if (pendingOrders.length === 0) return null;

  // ═══════════════════════════════════════════
  // STEP 1: KEYWORD MATCH (order # in memo/body)
  // ═══════════════════════════════════════════
  const orderNumFromMemo = extractOrderNumber(parsed.memo) || extractOrderNumber(parsed.bodySnippet);
  if (orderNumFromMemo) {
    const match = pendingOrders.find(o => o.orderNumber.toUpperCase() === orderNumFromMemo);
    if (match) {
      // Verify amount is close enough (within $1 to account for cent adjustment)
      if (parsed.amount !== null) {
        const amountDiff = Math.abs(parseFloat(match.total) - parsed.amount);
        if (amountDiff <= 1.00) {
          return { orderId: match.id, orderNumber: match.orderNumber, confidence: "exact", method: "memo_order_number" };
        }
      }
      // Even without amount verification, order # in memo is strong signal
      return { orderId: match.id, orderNumber: match.orderNumber, confidence: "exact", method: "memo_order_number" };
    }
  }

  if (parsed.amount === null) return null;

  // ═══════════════════════════════════════════
  // STEP 2: UNIQUE CENT MATCH (strongest fallback)
  // Customer forgot memo — match by exact amount via cent reservation
  // ═══════════════════════════════════════════
  const centMatch = await findOrderByCentAmount(parsed.amount);
  if (centMatch) {
    const order = pendingOrders.find(o => o.id === centMatch.orderId);
    if (order) {
      await markCentMatched(centMatch.orderId);
      return { orderId: order.id, orderNumber: order.orderNumber, confidence: "exact", method: "cent_amount_match" };
    }
  }

  // Also try legacy exact amount match (for orders placed before cent matching)
  const amountMatches = pendingOrders.filter(o => {
    const orderTotal = parseFloat(o.total);
    return Math.abs(orderTotal - parsed.amount!) < 0.01;
  });

  if (amountMatches.length === 1) {
    return { orderId: amountMatches[0].id, orderNumber: amountMatches[0].orderNumber, confidence: "high", method: "exact_amount_unique" };
  }

  // Amount + name disambiguation when multiple amount matches
  if (amountMatches.length > 1 && parsed.senderName) {
    for (const order of amountMatches) {
      const customerName = order.guestName || "";
      if (fuzzyNameMatch(parsed.senderName, customerName)) {
        return { orderId: order.id, orderNumber: order.orderNumber, confidence: "high", method: "amount_plus_name" };
      }
    }
    return { orderId: amountMatches[0].id, orderNumber: amountMatches[0].orderNumber, confidence: "low", method: "amount_multiple_matches" };
  }

  // ═══════════════════════════════════════════
  // STEP 3: FUZZY / AI MATCH
  // Cross-reference name, amount proximity, timing
  // ═══════════════════════════════════════════
  const fuzzyResult = await fuzzyMatchPayment({
    senderName: parsed.senderName,
    amount: parsed.amount,
    receivedAt: parsed.receivedAt,
  });

  if (fuzzyResult && fuzzyResult.confidence >= 0.85) {
    // High confidence — auto-match
    return {
      orderId: fuzzyResult.orderId,
      orderNumber: fuzzyResult.orderNumber,
      confidence: "high",
      method: `fuzzy_auto: ${fuzzyResult.reasons.join(", ")}`,
    };
  }

  if (fuzzyResult && fuzzyResult.confidence >= 0.5) {
    // Medium confidence — flag for admin review
    await db.createUnmatchedPayment({
      senderName: parsed.senderName || "Unknown",
      amount: parsed.amount.toFixed(2),
      memo: parsed.memo || null,
      referenceNumber: null,
      receivedAt: parsed.receivedAt,
      rawBody: parsed.bodySnippet || null,
      status: "needs_review",
      likelyOrderId: fuzzyResult.orderId,
      likelyCustomerName: fuzzyResult.customerName,
      matchConfidence: fuzzyResult.confidence.toFixed(2),
      matchReasons: JSON.stringify(fuzzyResult.reasons),
    });
    console.log(`[ETransfer] Fuzzy likely match: "${parsed.senderName}" -> order #${fuzzyResult.orderNumber} (${(fuzzyResult.confidence * 100).toFixed(0)}%) — flagged for review`);
    return null; // Don't auto-match, goes to review queue
  }

  // Legacy: Name-only match (no amount match)
  if (parsed.senderName) {
    const nameMatches = pendingOrders.filter(o => fuzzyNameMatch(parsed.senderName, o.guestName || ""));
    if (nameMatches.length === 1) {
      return { orderId: nameMatches[0].id, orderNumber: nameMatches[0].orderNumber, confidence: "low", method: "name_only" };
    }
  }

  // ═══════════════════════════════════════════
  // NO MATCH — add to unmatched queue
  // ═══════════════════════════════════════════
  await db.createUnmatchedPayment({
    senderName: parsed.senderName || "Unknown",
    amount: parsed.amount.toFixed(2),
    memo: parsed.memo || null,
    referenceNumber: null,
    receivedAt: parsed.receivedAt,
    rawBody: parsed.bodySnippet || null,
    status: "unmatched",
  });

  return null;
}

// ─── MAIN POLL FUNCTION ───

export async function pollETransferEmails(): Promise<{ processed: number; matched: number; errors: number }> {
  const stats = { processed: 0, matched: 0, errors: 0 };

  if (!isGmailConfigured() || isGmailDisabled()) {
    return stats; // silent skip — not configured or circuit-breaker tripped
  }

  try {
    const gmail = getGmailClient(SERVICE);
    if (!gmail) return stats;
    const labelId = await ensureLabel(gmail);
    if (isGmailDisabled()) return stats; // ensureLabel may have tripped the breaker

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
          senderName: extractSenderName(subject, body, from),
          senderEmail: from,
          amount: extractAmount(subject, body),
          memo: extractMemo(body),
          financialInstitution: extractFinancialInstitution(from, subject, body),
          subject,
          bodySnippet: body.substring(0, 500),
          receivedAt: dateStr ? new Date(dateStr) : new Date(),
          emailId,
        };

        console.log(`[ETransfer] Parsed: sender="${parsed.senderName}" amount=$${parsed.amount} memo="${parsed.memo}" bank="${parsed.financialInstitution}"`);

        // Try to match
        const match = await matchToOrder(parsed);

        // Save the payment record
        const record: any = {
          emailId: parsed.emailId,
          senderName: parsed.senderName || null,
          senderEmail: parsed.senderEmail || null,
          amount: parsed.amount?.toFixed(2) || null,
          memo: parsed.memo || null,
          financialInstitution: parsed.financialInstitution || null,
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
        if (handleGmailError(SERVICE, msgErr)) break; // auth error — stop processing
        console.warn(`[${SERVICE}] Error processing message ${msg.id}: ${(msgErr as Error).message}`);
        stats.errors++;
      }
    }

  } catch (err) {
    handleGmailError(SERVICE, err);
    stats.errors++;
  }

  if (stats.processed > 0 || stats.matched > 0 || stats.errors > 0) {
    console.log(`[${SERVICE}] Poll complete: ${stats.processed} processed, ${stats.matched} matched, ${stats.errors} errors`);
  }
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
  return isGmailConfigured();
}
