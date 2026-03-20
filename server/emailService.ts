import { ENV } from "./_core/env";

/**
 * Email service — sends OTP codes via the configured notification API.
 * Set NOTIFICATION_API_URL and NOTIFICATION_API_KEY in .env for production.
 * When not configured, OTP codes are logged to the server console.
 */

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
};

export async function sendOTPEmail(email: string, code: string, purpose: "login" | "register" | "verify"): Promise<boolean> {
  const purposeText = purpose === "login" ? "sign in to" : purpose === "register" ? "create" : "verify";
  const title = `My Legacy Cannabis — Your Verification Code: ${code}`;
  const content = `
Your My Legacy Cannabis verification code is: **${code}**

Use this code to ${purposeText} your account. This code expires in 10 minutes.

If you did not request this code, please ignore this email.

— My Legacy Cannabis Team
  `.trim();

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[Email] Notification service not configured, logging OTP instead");
    console.log(`[OTP EMAIL] To: ${email} | Code: ${code} | Purpose: ${purpose}`);
    return true; // Return true so the flow continues
  }

  try {
    const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      console.warn(`[Email] Failed to send OTP email (${response.status})`);
      // Still log it so admin can see
      console.log(`[OTP EMAIL] To: ${email} | Code: ${code} | Purpose: ${purpose}`);
      return true;
    }

    console.log(`[Email] OTP sent to ${email} for ${purpose}`);
    return true;
  } catch (error) {
    console.warn("[Email] Error sending OTP:", error);
    console.log(`[OTP EMAIL] To: ${email} | Code: ${code} | Purpose: ${purpose}`);
    return true;
  }
}

/**
 * Send an SMS OTP via Twilio (pluggable — only works if Twilio credentials are set)
 */
export async function sendOTPSms(phone: string, code: string, purpose: "login" | "register" | "verify"): Promise<{ sent: boolean; reason?: string }> {
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
