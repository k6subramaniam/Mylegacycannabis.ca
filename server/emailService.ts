import { Resend } from "resend";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";
import { recordEmailEvent, type EmailProvider } from "./emailHealthMonitor";

/**
 * Email service — sends OTP codes and notifications.
 *
 * Primary:  Resend API (HTTPS, works on Railway — set RESEND_API_KEY)
 * Fallback: SMTP/Gmail (set SMTP_HOST, SMTP_USER, SMTP_PASS)
 *
 * Every send attempt is recorded by the Email Health Monitor for
 * outage detection and admin visibility.
 *
 * Configuration (.env):
 *   RESEND_API_KEY=re_xxxx              <-- preferred (no port blocking)
 *   RESEND_FROM=My Legacy Cannabis <noreply@mylegacycannabis.ca>
 *
 *   SMTP_HOST=smtp.gmail.com            <-- fallback
 *   SMTP_PORT=587
 *   SMTP_USER=k6subramaniam@gmail.com
 *   SMTP_PASS=<Gmail App Password>
 *   SMTP_FROM="My Legacy Cannabis <k6subramaniam@gmail.com>"
 *   ADMIN_EMAIL=k6subramaniam@gmail.com
 */

// ─── Logo URL helper ───
// Returns the default logo URL (static fallback). For dynamic logos, use getLogoUrlDynamic().
function getLogoUrlFallback(): string {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/logo.png`;
  return `${process.env.SITE_URL || "https://mylegacycannabisca-production.up.railway.app"}/logo.png`;
}

// Loads the admin-managed logo URL from DB, falling back to the static default.
// This ensures OTP emails, admin notifications, and all other emails use the
// same logo the admin uploaded in Settings > Site Logo.
async function getLogoUrl(): Promise<string> {
  try {
    const { getSiteSetting } = await import("./db");
    const siteLogoUrl = await getSiteSetting("site_logo_url");
    if (siteLogoUrl) return siteLogoUrl;
    const emailLogoUrl = await getSiteSetting("email_logo_url");
    if (emailLogoUrl) return emailLogoUrl;
  } catch {
    // DB not ready yet (startup), fall back to static
  }
  return getLogoUrlFallback();
}

// ─── Resend client (lazy singleton) ───
let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

// ─── SMTP Transport (lazy singleton, fallback only) ───
let _transporter: nodemailer.Transporter | null = null;
let _smtpStatusLogged = false;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) {
    if (!_smtpStatusLogged) {
      _smtpStatusLogged = true;
      const missing = [
        !ENV.smtpHost && "SMTP_HOST",
        !ENV.smtpUser && "SMTP_USER",
        !ENV.smtpPass && "SMTP_PASS",
      ].filter(Boolean).join(", ");
      console.log(`[Email] SMTP not configured (missing: ${missing}). Using Resend only.`);
    }
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    family: 4,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  return _transporter;
}

// ─── Core send function — Resend first, SMTP fallback ───
// Instrumented: records every attempt in the Health Monitor
async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const start = Date.now();
  const resend = getResend();

  // ── Try Resend (primary) ──
  if (resend) {
    try {
      const from = process.env.RESEND_FROM ||
        (ENV.smtpFrom ? ENV.smtpFrom : "My Legacy Cannabis <noreply@mylegacycannabis.ca>");
      const { error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      });
      if (error) {
        console.warn(`[Email] Resend error for ${options.to}:`, error.message);
        recordEmailEvent({
          timestamp: new Date().toISOString(),
          provider: "resend",
          to: options.to,
          subject: options.subject,
          status: "failed",
          error: error.message,
          latencyMs: Date.now() - start,
        });
        // Fall through to SMTP
      } else {
        console.log(`[Email] Sent via Resend to ${options.to}: ${options.subject}`);
        recordEmailEvent({
          timestamp: new Date().toISOString(),
          provider: "resend",
          to: options.to,
          subject: options.subject,
          status: "sent",
          latencyMs: Date.now() - start,
        });
        return true;
      }
    } catch (err: any) {
      console.warn(`[Email] Resend exception for ${options.to}:`, err.message);
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "resend",
        to: options.to,
        subject: options.subject,
        status: "failed",
        error: err.message,
        latencyMs: Date.now() - start,
      });
      // Fall through to SMTP
    }
  }

  // ── Try SMTP (fallback) ──
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email] No delivery method configured. Would send to: ${options.to} | Subject: ${options.subject}`);
    // Only record if there was no Resend attempt (otherwise it was already recorded)
    if (!resend) {
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "unknown",
        to: options.to,
        subject: options.subject,
        status: "failed",
        error: "No email provider configured",
        latencyMs: Date.now() - start,
      });
    }
    return false;
  }

  try {
    const from = ENV.smtpFrom || `My Legacy Cannabis <${ENV.smtpUser}>`;
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
    console.log(`[Email] Sent via SMTP to ${options.to}: ${options.subject}`);
    recordEmailEvent({
      timestamp: new Date().toISOString(),
      provider: "smtp",
      to: options.to,
      subject: options.subject,
      status: "sent",
      latencyMs: Date.now() - start,
    });
    return true;
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${options.to}:`, error.message);
    recordEmailEvent({
      timestamp: new Date().toISOString(),
      provider: "smtp",
      to: options.to,
      subject: options.subject,
      status: "failed",
      error: error.message,
      latencyMs: Date.now() - start,
    });
    _transporter = null;
    return false;
  }
}

/**
 * Tracked send — used by the Health Monitor test email feature.
 * Returns structured result with provider info.
 */
export async function sendMailTracked(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; provider: EmailProvider; error?: string }> {
  const start = Date.now();
  const resend = getResend();

  // Try Resend
  if (resend) {
    try {
      const from = process.env.RESEND_FROM ||
        (ENV.smtpFrom ? ENV.smtpFrom : "My Legacy Cannabis <noreply@mylegacycannabis.ca>");
      const { error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      });
      if (!error) {
        recordEmailEvent({
          timestamp: new Date().toISOString(),
          provider: "resend",
          to: options.to,
          subject: options.subject,
          status: "sent",
          latencyMs: Date.now() - start,
        });
        return { success: true, provider: "resend" };
      }
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "resend",
        to: options.to,
        subject: options.subject,
        status: "failed",
        error: error.message,
        latencyMs: Date.now() - start,
      });
      // Fall through
    } catch (err: any) {
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "resend",
        to: options.to,
        subject: options.subject,
        status: "failed",
        error: err.message,
        latencyMs: Date.now() - start,
      });
    }
  }

  // Try SMTP
  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = ENV.smtpFrom || `My Legacy Cannabis <${ENV.smtpUser}>`;
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "smtp",
        to: options.to,
        subject: options.subject,
        status: "sent",
        latencyMs: Date.now() - start,
      });
      return { success: true, provider: "smtp" };
    } catch (err: any) {
      recordEmailEvent({
        timestamp: new Date().toISOString(),
        provider: "smtp",
        to: options.to,
        subject: options.subject,
        status: "failed",
        error: err.message,
        latencyMs: Date.now() - start,
      });
      return { success: false, provider: "smtp", error: err.message };
    }
  }

  return { success: false, provider: "unknown", error: "No email provider configured" };
}

// ─── Provider status (used by /api/auth/smtp-available) ───
export function getEmailProviderStatus(): {
  available: boolean;
  provider: "resend" | "smtp" | "none";
  adminEmail: string;
  missing: string[];
} {
  if (ENV.resendApiKey) {
    return { available: true, provider: "resend", adminEmail: ENV.adminEmail, missing: [] };
  }
  const missing = [
    !ENV.smtpHost && "SMTP_HOST",
    !ENV.smtpUser && "SMTP_USER",
    !ENV.smtpPass && "SMTP_PASS",
  ].filter(Boolean) as string[];
  if (missing.length === 0) {
    return { available: true, provider: "smtp", adminEmail: ENV.adminEmail, missing: [] };
  }
  return { available: false, provider: "none", adminEmail: ENV.adminEmail, missing };
}

// ─── OTP Email ───
export async function sendOTPEmail(
  email: string,
  code: string,
  purpose: "login" | "register" | "verify"
): Promise<boolean> {
  const purposeText =
    purpose === "login" ? "sign in to" : purpose === "register" ? "create" : "verify";

  const subject = `My Legacy Cannabis — Your Verification Code: ${code}`;
  const resolvedLogo = await getLogoUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${resolvedLogo}"
             alt="My Legacy Cannabis" style="height: 48px;" />
      </div>
      <h2 style="color: #4B2D8E; text-align: center; margin-bottom: 8px;">Verification Code</h2>
      <p style="color: #555; text-align: center; margin-bottom: 24px;">
        Use this code to ${purposeText} your account:
      </p>
      <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4B2D8E;">${code}</span>
      </div>
      <p style="color: #888; font-size: 13px; text-align: center;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">
        If you did not request this code, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #aaa; font-size: 11px; text-align: center;">
        My Legacy Cannabis · Mississauga, ON · mylegacycannabis.ca
      </p>
    </div>
  `;

  console.log(`[OTP EMAIL] To: ${email} | Code: ${code} | Purpose: ${purpose}`);

  const sent = await sendMail({ to: email, subject, html });

  if (!sent) {
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      try {
        const endpoint = ENV.forgeApiUrl.endsWith("/")
          ? `${ENV.forgeApiUrl}webdevtoken.v1.WebDevService/SendNotification`
          : `${ENV.forgeApiUrl}/webdevtoken.v1.WebDevService/SendNotification`;
        await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${ENV.forgeApiKey}`,
            "content-type": "application/json",
            "connect-protocol-version": "1",
          },
          body: JSON.stringify({ title: subject, content: html.replace(/<[^>]*>/g, "") }),
        });
      } catch {
        // Silently fail
      }
    }
  }

  return true;
}

// ─── OTP SMS (Twilio) ───
export async function sendOTPSms(
  phone: string,
  code: string,
  purpose: "login" | "register" | "verify"
): Promise<{ sent: boolean; reason?: string }> {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioPhoneNumber) {
    console.log(`[OTP SMS] Twilio not configured. Phone: ${phone} | Code: ${code} | Purpose: ${purpose}`);
    return { sent: false, reason: "SMS service not configured. Please use email verification instead." };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: phone,
      From: ENV.twilioPhoneNumber,
      Body: `Your My Legacy Cannabis verification code is: ${code}. This code expires in 10 minutes.`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`[SMS] Twilio error: ${errorData}`);
      return { sent: false, reason: "Failed to send SMS. Please try email verification." };
    }

    console.log(`[SMS] OTP sent to ${phone} for ${purpose}`);
    return { sent: true };
  } catch (error) {
    console.warn("[SMS] Error sending OTP:", error);
    return { sent: false, reason: "SMS service error. Please try email verification." };
  }
}

// ─── Admin/Owner Notification Email ───
export async function sendAdminNotification(
  subject: string,
  content: string
): Promise<boolean> {
  const adminEmail = ENV.adminEmail;
  if (!adminEmail) {
    console.log(`[Notification] No ADMIN_EMAIL configured. Subject: ${subject}`);
    return false;
  }

  const resolvedLogo = await getLogoUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${resolvedLogo}"
             alt="My Legacy Cannabis" style="height: 40px;" />
      </div>
      <div style="background: #4B2D8E; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 16px;">🔔 ${subject}</h2>
      </div>
      <div style="background: #F9F9F9; padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 0;">
          ${content.replace(/\n/g, "<br/>")}
        </p>
      </div>
      <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">
        My Legacy Cannabis Admin Notification · ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}
      </p>
    </div>
  `;

  return sendMail({ to: adminEmail, subject: `[My Legacy] ${subject}`, html });
}

// ─── Customer Notification Email ───
export async function sendCustomerEmail(
  to: string,
  subject: string,
  bodyHtml: string
): Promise<boolean> {
  // If bodyHtml is a full HTML document (from templates), send it raw
  if (bodyHtml.trimStart().startsWith("<!DOCTYPE") || bodyHtml.trimStart().startsWith("<html")) {
    return sendMail({ to, subject, html: bodyHtml });
  }

  // Otherwise wrap in a simple layout (for inline content)
  const resolvedLogo = await getLogoUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${resolvedLogo}"
             alt="My Legacy Cannabis" style="height: 40px;" />
      </div>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #aaa; font-size: 11px; text-align: center;">
        My Legacy Cannabis · Mississauga, ON · mylegacycannabis.ca
      </p>
    </div>
  `;

  return sendMail({ to, subject, html });
}

// ─── Raw Admin Email (for templated admin emails) ───
export async function sendAdminTemplatedEmail(
  subject: string,
  fullHtml: string
): Promise<boolean> {
  const adminEmail = ENV.adminEmail;
  if (!adminEmail) {
    console.log(`[Notification] No ADMIN_EMAIL configured. Subject: ${subject}`);
    return false;
  }
  return sendMail({ to: adminEmail, subject, html: fullHtml });
}
