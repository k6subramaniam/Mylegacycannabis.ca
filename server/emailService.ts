import nodemailer from "nodemailer";
import { lookup } from "dns";
import { ENV } from "./_core/env";

/**
 * Email service — sends OTP codes and notifications.
 *
 * Delivery priority:
 *   1. Resend HTTP API  (works on Railway — no SMTP port needed)
 *   2. SMTP / Nodemailer (fallback for local dev or Railway Pro plan)
 *   3. Console log       (last resort — OTP codes always logged)
 *
 * Configuration (.env):
 *   # Option A – Resend (recommended for Railway)
 *   RESEND_API_KEY=re_xxxxxxxx
 *   SMTP_FROM=My Legacy Cannabis <onboarding@resend.dev>   # or your verified domain
 *
 *   # Option B – Gmail SMTP (requires port 587 access)
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=k6subramaniam@gmail.com
 *   SMTP_PASS=<Gmail App Password>
 *   SMTP_FROM="My Legacy Cannabis <k6subramaniam@gmail.com>"
 *
 *   # Both options
 *   ADMIN_EMAIL=k6subramaniam@gmail.com
 */

// ─── Resend HTTP API ───
async function sendViaResend(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!ENV.resendApiKey) return false;

  try {
    const from = ENV.smtpFrom || "My Legacy Cannabis <onboarding@resend.dev>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[Email] Resend API error (${response.status}): ${body}`);
      return false;
    }

    console.log(`[Email] Sent via Resend to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Resend failed for ${options.to}:`, error.message);
    return false;
  }
}

// ─── SMTP / Nodemailer (fallback) ───
let _transporter: nodemailer.Transporter | null = null;
let _smtpStatusLogged = false;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) {
    return null; // SMTP not configured
  }

  // Force IPv4 DNS resolution — Railway containers can't reach Gmail over IPv6
  const ipv4Lookup = (hostname: string, options: any, cb: any) => {
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    return lookup(hostname, { ...options, family: 4 }, cb);
  };

  _transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    tls: { servername: ENV.smtpHost },
    dnsLookup: ipv4Lookup,
  } as any);

  _transporter.verify().then(() => {
    console.log("[Email] SMTP connection verified ✓");
  }).catch((err) => {
    console.warn("[Email] SMTP verify failed (will retry on send):", err.message);
  });

  return _transporter;
}

async function sendViaSMTP(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

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
    return true;
  } catch (error: any) {
    console.error(`[Email] SMTP failed for ${options.to}:`, error.message);
    return false;
  }
}

// ─── Unified send — tries Resend first, then SMTP, then logs ───
let _emailStatusLogged = false;

async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  // Log config status once
  if (!_emailStatusLogged) {
    _emailStatusLogged = true;
    const hasResend = Boolean(ENV.resendApiKey);
    const hasSMTP = Boolean(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass);
    if (hasResend) {
      console.log("[Email] Using Resend HTTP API (primary)");
    }
    if (hasSMTP) {
      console.log(`[Email] Using SMTP ${ENV.smtpHost}:${ENV.smtpPort} (${hasResend ? "fallback" : "primary"})`);
    }
    if (!hasResend && !hasSMTP) {
      const missing: string[] = [];
      if (!ENV.resendApiKey) missing.push("RESEND_API_KEY");
      if (!ENV.smtpPass) missing.push("SMTP_PASS");
      console.log(`[Email] No email provider configured (set ${missing.join(" or ")}). Emails will be logged to console.`);
      if (ENV.adminEmail) {
        console.log(`[Email] ADMIN_EMAIL is set (${ENV.adminEmail}) — admin notifications will appear in console.`);
      }
    }
  }

  // Try Resend first (HTTP API — works on Railway)
  if (ENV.resendApiKey) {
    const sent = await sendViaResend(options);
    if (sent) return true;
  }

  // Fallback to SMTP
  if (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass) {
    const sent = await sendViaSMTP(options);
    if (sent) return true;
  }

  // Last resort — log to console
  console.log(`[Email] No delivery channel available. Would send to: ${options.to} | Subject: ${options.subject}`);
  return false;
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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png"
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

  // Always log OTP to console for debugging
  console.log(`[OTP EMAIL] To: ${email} | Code: ${code} | Purpose: ${purpose}`);

  const sent = await sendMail({ to: email, subject, html });

  if (!sent) {
    // Fallback: try Forge notification API (original behavior)
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
        // Silently fail — OTP is already logged to console
      }
    }
  }

  return true; // Always return true so the auth flow continues
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png"
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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png"
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

// ─── Email provider status (for admin settings page) ───
export function getEmailProviderStatus(): {
  provider: "resend" | "smtp" | "none";
  available: boolean;
  adminEmail: string | null;
  missing: string[];
} {
  if (ENV.resendApiKey) {
    return { provider: "resend", available: true, adminEmail: ENV.adminEmail || null, missing: [] };
  }
  if (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass) {
    return { provider: "smtp", available: true, adminEmail: ENV.adminEmail || null, missing: [] };
  }
  const missing = [
    !ENV.resendApiKey && "RESEND_API_KEY",
    !ENV.smtpPass && "SMTP_PASS",
  ].filter(Boolean) as string[];
  return { provider: "none", available: false, adminEmail: ENV.adminEmail || null, missing };
}
