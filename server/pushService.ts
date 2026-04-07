/**
 * PWA Push Notification Service
 *
 * Uses the Web Push protocol (VAPID) to deliver notifications directly to
 * the device OS — bypassing SMS carriers that block cannabis businesses.
 *
 * Environment variables:
 *   VAPID_PUBLIC_KEY   — base64url-encoded ECDSA public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded ECDSA private key
 *   VAPID_SUBJECT      — mailto: or https: URL identifying the app server
 */

import webpush from "web-push";
import * as db from "./db";

// ─── CONFIG ───
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@mylegacycannabis.ca";

let _configured = false;

export function isPushServiceConfigured(): boolean {
  return _configured;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/** Call once at server startup */
export function initPushService(): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[Push] VAPID keys not configured — push notifications disabled");
    return;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    _configured = true;
    console.log("[Push] Service configured with VAPID keys");
  } catch (err) {
    console.error("[Push] Failed to configure VAPID:", (err as Error).message);
  }
}

// ─── TYPES ───
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

// ─── SEND TO SINGLE SUBSCRIPTION ───
async function sendToSubscription(
  sub: { id: number; endpoint: string; keysP256dh: string; keysAuth: string },
  payload: PushPayload,
  userId?: number | null,
): Promise<boolean> {
  if (!_configured) return false;

  const pushSub: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keysP256dh,
      auth: sub.keysAuth,
    },
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    // Update last pushed timestamp
    await db.updatePushSubscriptionLastPushed(sub.id).catch(() => {});
    // Log success
    await db.logPushNotification({
      subscriptionId: sub.id,
      userId: userId ?? null,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      tag: payload.tag ?? null,
      status: "sent",
    }).catch(() => {});
    return true;
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.code;

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired — remove it
      console.log(`[Push] Subscription expired (${statusCode}) — removing endpoint`);
      await db.deletePushSubscription(sub.endpoint).catch(() => {});
      await db.logPushNotification({
        subscriptionId: sub.id,
        userId: userId ?? null,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
        tag: payload.tag ?? null,
        status: "expired",
        errorMessage: `HTTP ${statusCode}`,
      }).catch(() => {});
    } else {
      console.warn(`[Push] Send failed (${statusCode}): ${err?.message?.substring(0, 100)}`);
      await db.logPushNotification({
        subscriptionId: sub.id,
        userId: userId ?? null,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
        tag: payload.tag ?? null,
        status: "failed",
        errorMessage: String(err?.message).substring(0, 500),
      }).catch(() => {});
    }
    return false;
  }
}

// ─── SEND TO A SPECIFIC USER ───
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!_configured) return { sent: 0, failed: 0 };

  const subs = await db.getUserPushSubscriptions(userId);
  const stats = { sent: 0, failed: 0 };

  for (const sub of subs) {
    const ok = await sendToSubscription(sub, payload, userId);
    ok ? stats.sent++ : stats.failed++;
  }

  return stats;
}

// ─── BROADCAST TO ALL ACTIVE SUBSCRIBERS ───
export async function broadcastPush(payload: PushPayload): Promise<{ sent: number; failed: number; expired: number }> {
  if (!_configured) return { sent: 0, failed: 0, expired: 0 };

  const subs = await db.getActivePushSubscriptions();
  const stats = { sent: 0, failed: 0, expired: 0 };

  // Send in parallel batches of 50 to avoid overwhelming the push service
  const BATCH_SIZE = 50;
  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const batch = subs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(sub => sendToSubscription(sub, payload, sub.userId))
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        stats.sent++;
      } else {
        stats.failed++;
      }
    }
  }

  console.log(`[Push] Broadcast: ${stats.sent} sent, ${stats.failed} failed (${subs.length} total subscribers)`);
  return stats;
}

// ─── NOTIFICATION TRIGGER HELPERS ───
// These are called from business logic (order status changes, rewards, etc.)

export async function notifyOrderStatusChange(
  userId: number,
  orderNumber: string,
  status: string,
): Promise<void> {
  const messages: Record<string, PushPayload> = {
    confirmed: {
      title: "Order Confirmed",
      body: `Your order ${orderNumber} has been confirmed. We're preparing it now.`,
      url: `/account`,
      tag: `order-${orderNumber}`,
    },
    shipped: {
      title: "Order Shipped",
      body: `Your order ${orderNumber} is on its way!`,
      url: `/account`,
      tag: `order-${orderNumber}`,
    },
    delivered: {
      title: "Order Delivered",
      body: `Your order ${orderNumber} has been delivered. Enjoy!`,
      url: `/account`,
      tag: `order-${orderNumber}`,
    },
    ready: {
      title: "Order Ready for Pickup",
      body: `Your order ${orderNumber} is ready! Visit your nearest store.`,
      url: `/locations`,
      tag: `order-${orderNumber}`,
    },
  };

  const payload = messages[status];
  if (payload) {
    await sendPushToUser(userId, payload);
  }
}

export async function notifyPaymentReceived(
  userId: number,
  orderNumber: string,
  amount: number,
): Promise<void> {
  await sendPushToUser(userId, {
    title: "Payment Received",
    body: `We received your $${amount.toFixed(2)} e-Transfer for order ${orderNumber}.`,
    url: `/account`,
    tag: `payment-${orderNumber}`,
  });
}

export async function notifyTierUpgrade(
  userId: number,
  newTier: string,
): Promise<void> {
  await sendPushToUser(userId, {
    title: "Tier Upgrade!",
    body: `You've reached ${newTier}! Check your new perks and rewards.`,
    url: `/rewards`,
    tag: "tier-upgrade",
  });
}

export async function notifyNewProductDrop(
  productName: string,
  slug: string,
): Promise<void> {
  await broadcastPush({
    title: "New Drop",
    body: `${productName} just landed. Limited availability.`,
    url: `/product/${slug}`,
    tag: "new-drop",
  });
}

export async function sendWinbackNotifications(): Promise<number> {
  // Get all active subscriptions that haven't been pushed in 30+ days
  const allSubs = await db.getActivePushSubscriptions();
  let sent = 0;

  for (const sub of allSubs) {
    const lastPush = sub.lastPushedAt ? new Date(sub.lastPushedAt).getTime() : 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    if (lastPush < thirtyDaysAgo) {
      const ok = await sendToSubscription(sub, {
        title: "We miss you",
        body: "New arrivals since your last visit. Come check them out.",
        url: "/shop?sort=newest",
        tag: "winback",
      }, sub.userId);
      if (ok) sent++;
    }
  }

  if (sent > 0) {
    console.log(`[Push] Win-back: sent to ${sent} inactive subscriber(s)`);
  }
  return sent;
}
