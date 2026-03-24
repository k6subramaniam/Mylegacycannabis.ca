import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { sendAdminNotification } from "../emailService";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

const NOTIFICATION_TIMEOUT_MS = 10_000; // 10 seconds max per channel

/**
 * Dispatches a project-owner notification via:
 * 1. SMTP email to ADMIN_EMAIL (primary — real email delivery)
 * 2. Forge notification API (secondary — in-app notification)
 *
 * Returns `true` if at least one channel succeeded.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  let emailSent = false;
  let forgeSent = false;

  // ── 1. Send real email to admin (with timeout) ──
  try {
    emailSent = await Promise.race([
      sendAdminNotification(title, content),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), NOTIFICATION_TIMEOUT_MS)),
    ]);
  } catch (err) {
    console.warn("[Notification] Email notification failed:", err);
  }

  // ── 2. Forge notification API (with timeout) ──
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    try {
      const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({ title, content }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        forgeSent = true;
      } else {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[Notification] Forge API failed (${response.status})${detail ? `: ${detail}` : ""}`
        );
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(`[Notification] Forge API timed out after ${NOTIFICATION_TIMEOUT_MS / 1000}s`);
      } else {
        console.warn("[Notification] Forge API error:", error);
      }
    }
  }

  if (!emailSent && !forgeSent) {
    console.warn(`[Notification] All channels failed for: "${title}". SMTP_PASS may be missing — set a Gmail App Password in .env for real email delivery.`);
  }

  return emailSent || forgeSent;
}

/**
 * Fire-and-forget variant — logs errors but never blocks the caller.
 * Use this for customer-facing mutations (submitOrder, submitVerification)
 * so the user gets an instant response.
 */
export function notifyOwnerAsync(payload: NotificationPayload): void {
  notifyOwner(payload).catch((err) =>
    console.error("[Notification] Background send failed:", err)
  );
}
