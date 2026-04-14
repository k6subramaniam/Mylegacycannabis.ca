import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import * as db from "./db";
import { nanoid } from "nanoid";
import { sendOTPEmail, sendOTPSms, getEmailProviderStatus } from "./emailService";
import { triggerWelcomeEmail } from "./emailTemplateEngine";
import rateLimit from "express-rate-limit";
import { buildFullUserResponse } from "./userHelpers";
import { isDisposableEmail, validateCanadianPhone, isValidEmailFormat } from "./validation";
import crypto from "crypto";

function generateOTP(): string {
  // Use cryptographically secure PRNG for OTP generation
  return crypto.randomInt(100000, 1000000).toString();
}

/** Extract client IP from request — uses req.ip which respects Express "trust proxy" setting */
function getClientIp(req: Request): string {
  return req.ip || "unknown";
}

function isAtLeast19(birthday: string): boolean {
  // Parse date parts directly to avoid timezone ambiguity (YYYY-MM-DD)
  const parts = birthday.split('-');
  if (parts.length !== 3) return false;
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const birthDay = parseInt(parts[2], 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return false;
  if (birthYear < 1900 || birthYear > new Date().getFullYear()) return false;

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed
  const todayDay = today.getDate();

  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age--;
  }
  return age >= 19;
}

function normalizePhone(phone: string): string {
  // Remove all non-digits, then ensure +1 prefix for Canadian numbers
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  if (!digits.startsWith("+")) digits = "+" + digits;
  return digits;
}

async function setSessionCookie(res: Response, req: Request, openId: string, name: string) {
  const sessionToken = await sdk.createSessionToken(openId, {
    name: name || "",
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

/**
 * Resolve the public-facing base URL (protocol + host).
 * Respects X-Forwarded-Proto / X-Forwarded-Host set by reverse proxies
 * (Railway, Cloudflare, Nginx, etc.).
 */
function getBaseUrl(req: Request): string {
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export function registerCustomAuthRoutes(app: Express) {
  // Trust proxy headers so req.protocol and req.hostname resolve correctly
  // behind Railway / Cloudflare / Nginx reverse proxies.
  app.set("trust proxy", 1);

  const completeProfileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 complete-profile requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });

  const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 OTP send requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many verification requests. Please try again later." }
  });

  const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 OTP verify requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many verification attempts. Please try again later." }
  });

  // ─── SEND OTP (Email or SMS) ───
  app.post("/api/auth/send-otp", otpSendLimiter, async (req: Request, res: Response) => {
    try {
      const { identifier, type, purpose } = req.body as {
        identifier: string;
        type: "email" | "sms";
        purpose: "login" | "register" | "verify";
      };

      if (!identifier || !type) {
        res.status(400).json({ error: "identifier and type are required" });
        return;
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // For login, check if user exists
      if (purpose === "login") {
        if (type === "email") {
          const user = await db.getUserByEmail(identifier);
          if (!user) {
            res.status(404).json({ error: "No account found with this email. Please register first." });
            return;
          }
        } else if (type === "sms") {
          const normalized = normalizePhone(identifier);
          const user = await db.getUserByPhone(normalized);
          if (!user) {
            res.status(404).json({ error: "No account found with this phone number. Please register first." });
            return;
          }
        }
      }

      // For register, check if user already exists
      if (purpose === "register") {
        if (type === "email") {
          const existing = await db.getUserByEmail(identifier);
          if (existing) {
            res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
            return;
          }
        }
      }

      // Store the code
      const normalizedIdentifier = type === "sms" ? normalizePhone(identifier) : identifier.toLowerCase().trim();
      await db.createVerificationCode({
        identifier: normalizedIdentifier,
        code,
        type,
        purpose: purpose || "login",
        expiresAt,
      });

      // Send the code
      if (type === "email") {
        await sendOTPEmail(identifier, code, purpose || "login");
        res.json({ success: true, message: "Verification code sent to your email.", method: "email" });
      } else if (type === "sms") {
        const smsResult = await sendOTPSms(normalizedIdentifier, code, purpose || "login");
        if (smsResult.sent) {
          res.json({ success: true, message: "Verification code sent to your phone.", method: "sms" });
        } else {
          // SMS failed — fall back to email notification to admin
          console.log(`[OTP FALLBACK] SMS failed for ${normalizedIdentifier}. Code: ${code}`);
          res.json({
            success: true,
            message: smsResult.reason || "SMS service is not yet configured. The code has been logged for admin verification.",
            method: "sms_pending",
            fallback: true,
          });
        }
      }
    } catch (error) {
      console.error("[Auth] Send OTP error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // ─── VERIFY OTP & LOGIN/REGISTER ───
  app.post("/api/auth/verify-otp", otpVerifyLimiter, async (req: Request, res: Response) => {
    try {
      const { identifier, code, type, purpose, registrationData } = req.body as {
        identifier: string;
        code: string;
        type: "email" | "sms";
        purpose: "login" | "register" | "verify";
        registrationData?: {
          name?: string;
          firstName?: string;
          lastName?: string;
          email: string;
          phone: string;
          birthday?: string;
          referralCode?: string;
        };
      };

      if (!identifier || !code || !type) {
        res.status(400).json({ error: "identifier, code, and type are required" });
        return;
      }

      const normalizedIdentifier = type === "sms" ? normalizePhone(identifier) : identifier.toLowerCase().trim();
      const result = await db.verifyCode(normalizedIdentifier, code, type);

      if (!result.valid) {
        res.status(400).json({ error: result.reason || "Invalid verification code" });
        return;
      }

      // Code is valid — handle login vs register
      if (purpose === "register") {
        // Accept both old "name" and new "firstName"/"lastName" fields
        const firstName = registrationData?.firstName || "";
        const lastName = registrationData?.lastName || "";
        const fullName = registrationData?.name || `${firstName} ${lastName}`.trim();

        if (!fullName || !registrationData?.phone) {
          res.status(400).json({ error: "Name and phone number are required for registration" });
          return;
        }

        // ─── EMAIL VALIDATION ───
        if (registrationData.email) {
          if (!isValidEmailFormat(registrationData.email)) {
            res.status(400).json({ error: "Please enter a valid email address." });
            return;
          }
          if (isDisposableEmail(registrationData.email)) {
            res.status(400).json({ error: "Temporary or disposable email addresses are not accepted. Please use a permanent email." });
            await db.logSystem({ level: "warn", source: "auth", action: "register_blocked", message: `Disposable email rejected: ${registrationData.email}`, ipAddress: getClientIp(req) });
            return;
          }
        }

        // ─── PHONE VALIDATION ───
        const phoneValidation = validateCanadianPhone(registrationData.phone);
        if (!phoneValidation.valid) {
          res.status(400).json({ error: phoneValidation.error });
          await db.logSystem({ level: "warn", source: "auth", action: "register_blocked", message: `Invalid phone rejected: ${registrationData.phone} — ${phoneValidation.error}`, ipAddress: getClientIp(req) });
          return;
        }

        // ─── AGE GATE: must be 19+ ───
        if (!registrationData.birthday) {
          res.status(400).json({ error: "Date of birth is required. You must be 19 or older to create an account." });
          return;
        }
        if (!isAtLeast19(registrationData.birthday)) {
          res.status(403).json({ error: "You must be 19 years of age or older to create an account." });
          return;
        }

        const normalizedPhone = phoneValidation.normalized || normalizePhone(registrationData.phone);

        // Check if phone already exists
        const existingPhone = await db.getUserByPhone(normalizedPhone);
        if (existingPhone) {
          res.status(409).json({ error: "An account with this phone number already exists." });
          return;
        }

        // Create user with a unique openId
        const openId = `local_${nanoid(16)}`;
        await db.upsertUser({
          openId,
          name: fullName,
          email: registrationData.email?.toLowerCase().trim() || null,
          phone: normalizedPhone,
          loginMethod: type === "email" ? "email" : "phone",
          lastSignedIn: new Date(),
        });

        // Update additional fields
        const clientIp = getClientIp(req);
        const newUser = await db.getUserByOpenId(openId);
        if (newUser) {
          await db.updateUser(newUser.id, {
            phoneVerified: type === "sms" ? true : false,
            emailVerified: type === "email" ? true : false,
            authMethod: type === "email" ? "email" : "phone",
            birthday: registrationData.birthday || null,
            rewardPoints: 25, // Welcome bonus!
            registrationIp: clientIp,
            lastIp: clientIp,
          } as any);

          // Log welcome bonus in rewards history
          try {
            await db.addRewardsHistory({ userId: newUser.id, points: 25, type: 'earned' as any, description: 'Welcome bonus for creating an account' } as any);
          } catch (e) { console.warn("[Register] Failed to log welcome bonus history:", e); }

          // ─── REFERRAL CODE: award points to both referrer and referee ───
          if (registrationData.referralCode) {
            try {
              const REFERRAL_BONUS_REFERRER = 50;
              const REFERRAL_BONUS_REFEREE = 25;
              const refCode = await db.getReferralCodeByCode(registrationData.referralCode);
              if (refCode && refCode.userId !== newUser.id) {
                // Award referrer
                const referrer = await db.getUserById(refCode.userId);
                if (referrer) {
                  await db.updateUser(referrer.id, { rewardPoints: (referrer.rewardPoints || 0) + REFERRAL_BONUS_REFERRER } as any);
                  await db.addRewardsHistory({ userId: referrer.id, points: REFERRAL_BONUS_REFERRER, type: 'referral' as any, description: `Referral bonus: ${registrationData.name || registrationData.email} joined using your code` } as any);
                }
                // Award referee (new user)
                const currentPoints = 25; // already set welcome bonus above
                await db.updateUser(newUser.id, { rewardPoints: currentPoints + REFERRAL_BONUS_REFEREE, referredBy: refCode.userId } as any);
                await db.addRewardsHistory({ userId: newUser.id, points: REFERRAL_BONUS_REFEREE, type: 'referral' as any, description: `Referral bonus: Used code ${registrationData.referralCode}` } as any);
                // Track referral
                await db.trackReferral({ referrerId: refCode.userId, refereeId: newUser.id, referralCodeId: refCode.id, referrerPointsAwarded: true, refereePointsAwarded: true });
                console.log(`[Referral] ${registrationData.email} used code ${registrationData.referralCode}. Referrer +${REFERRAL_BONUS_REFERRER} pts, Referee +${REFERRAL_BONUS_REFEREE} pts`);
              } else if (!refCode) {
                console.warn(`[Referral] Invalid referral code: ${registrationData.referralCode}`);
              }
            } catch (refErr) {
              console.warn("[Register] Referral processing failed (non-blocking):", refErr);
            }
          }
        }

        await setSessionCookie(res, req, openId, fullName);

        // Return full user data
        const createdUser = await db.getUserByOpenId(openId);
        const fullRegUser = createdUser ? await buildFullUserResponse(createdUser) : { name: fullName, email: registrationData.email, phone: normalizedPhone };

        // Fire-and-forget: send welcome email
        if (registrationData.email) {
          triggerWelcomeEmail({
            customerName: fullName,
            customerEmail: registrationData.email,
          }).catch(err => console.warn("[Register] Welcome email failed:", err.message));
          // Log registration
          db.logSystem({ level: "info", source: "auth", action: "register", message: `New user registered: ${registrationData.email}`, userId: newUser?.id, ipAddress: clientIp }).catch(() => {});
        }

        res.json({
          success: true,
          message: "Account created successfully! You earned 25 welcome bonus points.",
          user: fullRegUser,
        });

      } else {
        // Login flow
        let user;
        if (type === "email") {
          user = await db.getUserByEmail(normalizedIdentifier);
        } else {
          user = await db.getUserByPhone(normalizedIdentifier);
        }

        if (!user) {
          res.status(404).json({ error: "Account not found" });
          return;
        }

        // Enforce account lock
        if ((user as any).isLocked) {
          res.status(403).json({ error: "Your account has been locked. Please contact support at support@mylegacycannabis.ca." });
          return;
        }

        // Update verified status
        if (type === "email" && !user.emailVerified) {
          await db.updateUser(user.id, { emailVerified: true } as any);
        }
        if (type === "sms" && !user.phoneVerified) {
          await db.updateUser(user.id, { phoneVerified: true } as any);
        }

        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        // Track IP on login
        const loginIp = getClientIp(req);
        await db.updateUser(user.id, { lastIp: loginIp } as any).catch(() => {});
        await db.logSystem({ level: "info", source: "auth", action: "login", message: `User logged in: ${user.email || user.phone}`, userId: user.id, ipAddress: loginIp }).catch(() => {});

        await setSessionCookie(res, req, user.openId, user.name || "");

        // Return full user data (orders, verification status, rewards)
        const fullUser = await buildFullUserResponse(user);
        res.json({
          success: true,
          message: "Signed in successfully!",
          user: fullUser,
        });
      }
    } catch (error) {
      console.error("[Auth] Verify OTP error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ─── GOOGLE OAUTH CALLBACK ───
  // Step 1: Redirect to Google
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(503).json({ error: "Google login is not configured yet." });
      return;
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const state = req.query.returnTo as string || "/";
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", Buffer.from(state).toString("base64"));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");

    res.redirect(url.toString());
  });

  // Step 2: Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const returnTo = state ? Buffer.from(state, "base64").toString() : "/";

      console.log(`[Google Auth] Callback received — returnTo: ${returnTo}, hasCode: ${!!code}`);

      if (!code) {
        res.redirect(`/login?error=google_auth_failed`);
        return;
      }

      const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("[Google Auth] Token exchange failed");
        res.redirect(`/login?error=google_token_failed`);
        return;
      }

      const tokens = await tokenResponse.json() as { access_token: string; id_token: string };

      // Get user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        res.redirect(`/login?error=google_userinfo_failed`);
        return;
      }

      const googleUser = await userInfoResponse.json() as {
        id: string;
        email: string;
        name: string;
        picture: string;
      };

      // Check if user exists by Google ID or email
      let user = await db.getUserByGoogleId(googleUser.id);
      if (!user && googleUser.email) {
        user = await db.getUserByEmail(googleUser.email);
      }

      if (user) {
        // Existing user — update Google ID if needed
        if (!user.googleId) {
          await db.updateUser(user.id, { googleId: googleUser.id, emailVerified: true } as any);
        }
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await setSessionCookie(res, req, user.openId, user.name || googleUser.name);

        // If user doesn't have a phone, redirect to complete profile
        if (!user.phone) {
          console.log(`[Google Auth] Existing user ${googleUser.email} — no phone, redirecting to /complete-profile`);
          res.redirect(`/complete-profile?from=google`);
          return;
        }

        console.log(`[Google Auth] Existing user ${googleUser.email} — session set, redirecting to ${returnTo}`);
        res.redirect(returnTo);
      } else {
        // New user — create account but require phone number
        const openId = `google_${nanoid(16)}`;
        await db.upsertUser({
          openId,
          name: googleUser.name,
          email: googleUser.email,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });

        const newUser = await db.getUserByOpenId(openId);
        if (newUser) {
          await db.updateUser(newUser.id, {
            googleId: googleUser.id,
            emailVerified: true,
            authMethod: "google",
            rewardPoints: 25, // Welcome bonus
          } as any);
        }

        await setSessionCookie(res, req, openId, googleUser.name);

        // Redirect to complete profile (phone is mandatory)
        console.log(`[Google Auth] New user ${googleUser.email} — session set, redirecting to /complete-profile`);
        res.redirect(`/complete-profile?from=google&welcome=true`);
      }
    } catch (error) {
      console.error("[Google Auth] Callback error:", error);
      res.redirect(`/login?error=google_auth_error`);
    }
  });

  // ─── COMPLETE PROFILE (add mandatory phone) ───
  app.post("/api/auth/complete-profile", completeProfileLimiter, async (req: Request, res: Response) => {
    try {
      // Get current user from session
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Please sign in first" });
        return;
      }

      const { phone, birthday, name } = req.body as { phone: string; birthday?: string; name?: string };

      if (!phone) {
        res.status(400).json({ error: "Phone number is required" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      // Check if phone already exists
      const existingPhone = await db.getUserByPhone(normalizedPhone);
      if (existingPhone && existingPhone.id !== user.id) {
        res.status(409).json({ error: "This phone number is already associated with another account." });
        return;
      }

      // ─── AGE GATE: must be 19+ ───
      if (birthday && !isAtLeast19(birthday)) {
        res.status(403).json({ error: "You must be 19 years of age or older." });
        return;
      }

      const updates: Record<string, any> = { phone: normalizedPhone };
      if (birthday) updates.birthday = birthday;
      if (name) updates.name = name;

      await db.updateUser(user.id, updates);

      res.json({ success: true, message: "Profile updated successfully!" });
    } catch (error) {
      console.error("[Auth] Complete profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ─── CHECK SMS AVAILABILITY ───
  app.get("/api/auth/sms-available", (_req: Request, res: Response) => {
    const available = Boolean(ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioPhoneNumber);
    res.json({ available });
  });

  // ─── CHECK GOOGLE AVAILABILITY ───
  app.get("/api/auth/google-available", (_req: Request, res: Response) => {
    const available = Boolean(ENV.googleClientId && ENV.googleClientSecret);
    res.json({ available });
  });

  // ─── CHECK EMAIL PROVIDER AVAILABILITY ───
  app.get("/api/auth/smtp-available", (_req: Request, res: Response) => {
    const status = getEmailProviderStatus();
    res.json({
      available: status.available,
      provider: status.provider,
      adminEmail: status.adminEmail,
      adminEmailConfigured: Boolean(status.adminEmail),
      missing: status.missing,
    });
  });
}
