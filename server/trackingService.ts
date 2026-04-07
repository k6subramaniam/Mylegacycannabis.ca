/**
 * Tracking Email Monitor Service
 *
 * Polls a Gmail inbox for Canada Post delivery notifications,
 * parses tracking updates, and automatically marks shipped orders
 * as "delivered" when a delivery confirmation email is received.
 *
 * Uses the same Gmail credentials as the e-Transfer service.
 *
 * Environment variables (shared with etransferService):
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REFRESH_TOKEN
 */

import { google } from "googleapis";
import * as db from "./db";
import { triggerOrderStatusUpdate } from "./emailTemplateEngine";
import {
  isGmailConfigured,
  isGmailDisabled,
  getGmailClient,
  handleGmailError,
} from "./gmailAuth";

const TRACKING_PROCESSED_LABEL = "tracking-processed";
const SERVICE = "Tracking";

// ─── ENSURE LABEL EXISTS ───
async function ensureLabel(gmail: ReturnType<typeof google.gmail>) {
  try {
    const res = await gmail.users.labels.list({ userId: "me" });
    const labels = res.data.labels || [];
    const existing = labels.find(l => l.name === TRACKING_PROCESSED_LABEL);
    if (existing) return existing.id!;

    const created = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: TRACKING_PROCESSED_LABEL,
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

// ─── DELIVERY INDICATORS ───
// Patterns that indicate a package has been delivered
const DELIVERY_INDICATORS = [
  /(?:has been|was)\s+(?:successfully\s+)?delivered/i,
  /delivery\s+(?:confirmation|notice|complete)/i,
  /your\s+(?:package|item|shipment)\s+(?:has been|was)\s+delivered/i,
  /item\s+delivered/i,
  /delivered\s+(?:to|at|on)/i,
  /livr[ée]e?\s+(?:avec|au|le|a)/i,   // French: delivered
  /livraison\s+effectu[ée]e/i,        // French: delivery completed
  /notice.*delivered/i,
  /successful\s+delivery/i,
];

// Patterns to extract tracking numbers from emails
const TRACKING_NUMBER_PATTERNS = [
  /\b(\d{16})\b/,                         // 16-digit domestic PIN
  /\b(\d{12})\b/,                         // 12-digit domestic PIN
  /\b([A-Z]{2}\d{9}CA)\b/,              // S10 international (EE123456789CA)
  /\b([A-Z]{2}\d{7}CA)\b/,              // Domestic (AB1234567CA)
  /tracking\s*(?:number|#|no\.?)\s*[:：]?\s*([A-Z0-9]{10,16})/i,
  /numero\s*de\s*suivi\s*[:：]?\s*([A-Z0-9]{10,16})/i, // French
];

// ─── HELPERS ───

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
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  const parts = payload.parts || [];
  let textPart = "";
  let htmlPart = "";
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      textPart = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlPart = decodeBase64Url(part.body.data);
    } else if (part.parts) {
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

function isDeliveryEmail(subject: string, body: string): boolean {
  const combined = `${subject} ${body}`;
  return DELIVERY_INDICATORS.some(p => p.test(combined));
}

function extractTrackingNumbers(subject: string, body: string): string[] {
  const combined = `${subject}\n${body}`;
  const found = new Set<string>();
  for (const pattern of TRACKING_NUMBER_PATTERNS) {
    const globalPattern = new RegExp(pattern, "g");
    let m: RegExpExecArray | null;
    while ((m = globalPattern.exec(combined)) !== null) {
      if (m[1]) found.add(m[1].toUpperCase());
    }
  }
  return Array.from(found);
}

// ─── MAIN POLL FUNCTION ───

export async function pollTrackingEmails(): Promise<{ processed: number; deliveredOrders: number; errors: number }> {
  const stats = { processed: 0, deliveredOrders: 0, errors: 0 };

  if (!isGmailConfigured() || isGmailDisabled()) {
    return stats; // silent skip
  }

  try {
    const gmail = getGmailClient(SERVICE);
    if (!gmail) return stats;
    const labelId = await ensureLabel(gmail);
    if (isGmailDisabled()) return stats; // ensureLabel may have tripped the breaker

    // Search for delivery notification emails not yet labelled as processed
    const query = `(delivered OR "delivery confirmation" OR "delivery notice" OR "livraison" OR "item delivered") -label:${TRACKING_PROCESSED_LABEL} newer_than:7d`;

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      return stats;
    }

    console.log(`[Tracking] Found ${messages.length} potential delivery email(s)`);

    // Get all shipped orders to cross-reference tracking numbers
    const shippedOrders = await db.getAllOrders({ status: "shipped", limit: 500 });
    const ordersByTracking = new Map<string, any>();
    for (const order of shippedOrders.data) {
      if (order.trackingNumber) {
        ordersByTracking.set(order.trackingNumber.toUpperCase(), order);
      }
    }

    for (const msg of messages) {
      try {
        const emailId = msg.id!;

        // Fetch full message
        const msgRes = await gmail.users.messages.get({ userId: "me", id: emailId, format: "full" });
        const payload = msgRes.data.payload;
        if (!payload) continue;

        const headers = payload.headers || [];
        const subject = getHeader(headers, "Subject");
        const body = getEmailBody(payload);

        // Check if this is actually a delivery notification
        if (!isDeliveryEmail(subject, body)) {
          if (labelId) {
            await gmail.users.messages.modify({ userId: "me", id: emailId, requestBody: { addLabelIds: [labelId] } }).catch(() => {});
          }
          continue;
        }

        stats.processed++;

        // Extract tracking numbers from the email
        const trackingNumbers = extractTrackingNumbers(subject, body);

        let matched = false;
        for (const trackNum of trackingNumbers) {
          const order = ordersByTracking.get(trackNum);
          if (order && order.status === "shipped") {
            // Mark order as delivered
            await db.updateOrder(order.id, { status: "delivered" });

            // Award reward points
            const pointsResult = await db.awardOrderPoints(order.id);
            if (pointsResult) {
              console.log(`[Tracking] Awarded ${pointsResult.points} points for delivered order #${order.orderNumber}`);
            }

            // Send status update email to customer
            if (order.guestEmail) {
              triggerOrderStatusUpdate({
                customerName: order.guestName || "Customer",
                customerEmail: order.guestEmail,
                orderId: order.orderNumber || String(order.id),
                orderStatus: "Delivered",
                statusMessage: "Your order has been delivered. Thank you for shopping with MyLegacy Cannabis! We hope you enjoy your purchase.",
              }).catch(err => console.warn("[Tracking] Status email failed:", err.message));
            }

            // Log admin activity
            await db.logAdminActivity({
              adminId: 0,
              adminName: "System",
              action: "auto_delivered",
              entityType: "order",
              entityId: order.id,
              details: `Auto-marked order ${order.orderNumber} as delivered (tracking: ${trackNum})`,
            });

            stats.deliveredOrders++;
            matched = true;
            console.log(`[Tracking] Auto-delivered order ${order.orderNumber} (tracking: ${trackNum})`);
          }
        }

        if (!matched && trackingNumbers.length > 0) {
          console.log(`[Tracking] Delivery email with tracking ${trackingNumbers.join(", ")} — no matching shipped orders found`);
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

  if (stats.deliveredOrders > 0 || stats.errors > 0) {
    console.log(`[${SERVICE}] Poll complete: ${stats.processed} processed, ${stats.deliveredOrders} auto-delivered, ${stats.errors} errors`);
  }
  return stats;
}

export function isTrackingServiceConfigured(): boolean {
  return isGmailConfigured();
}
