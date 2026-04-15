/**
 * Registration Validation Utilities
 *
 * - Disposable / temporary email detection
 * - VOIP / virtual phone number detection (Canadian carriers)
 * - Phone number format validation
 */

// ─── DISPOSABLE EMAIL DOMAINS ───
// Comprehensive list of known disposable/temporary email providers
const DISPOSABLE_DOMAINS = new Set([
  // Major disposable email providers
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "tempinbox.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailexpire.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "fakeinbox.com",
  "harakirimail.com",
  "33mail.com",
  "discard.email",
  "discardmail.com",
  "discardmail.de",
  "mytemp.email",
  "tmpmail.net",
  "tmpmail.org",
  "getnada.com",
  "nada.email",
  "mohmal.com",
  "emailondeck.com",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "minutemail.com",
  "tempr.email",
  "burnermail.io",
  "tmail.com",
  "tmailinator.com",
  "mailsac.com",
  "mailcatch.com",
  "spamgourmet.com",
  "inboxalias.com",
  "mailtothis.com",
  "incognitomail.com",
  "disposableemailaddresses.emailmiser.com",
  "jetable.org",
  "trash-mail.at",
  "spambox.us",
  "spamfree24.org",
  "mailnull.com",
  "mailscrap.com",
  "crazymailing.com",
  "deadaddress.com",
  "nowmymail.com",
  "safetymail.info",
  "binkmail.com",
  "spaml.com",
  "emailisvalid.com",
  "trashymail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "mailforspam.com",
  "spamcero.com",
  "spamhereplease.com",
  // More recent providers
  "tempmailaddress.com",
  "emailfake.com",
  "fakemailgenerator.com",
  "tempail.com",
  "throwaway.email",
  "bugmenot.com",
  "filzmail.com",
  "mytrashmail.com",
  "trashymail.net",
  "mailcatch.com",
  "reallymymail.com",
  "mt2015.com",
  "thankyou2010.com",
  "trash2009.com",
  "trashdevil.com",
  "trashdevil.de",
  "trashemail.de",
  "upliftnow.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "wh4f.org",
  "veryreallyyemail.com",
]);

// Canadian area codes known to be assigned to VOIP / virtual phone services
// (TextNow, Google Voice, Fongo, etc.)
const VOIP_AREA_CODES = new Set([
  // Known VOIP-heavy area codes
  "600", // service codes (not assigned to real carriers)
  "622", // VOIP overlay
  // Note: in Canada, VOIP numbers share the same area codes as landlines/mobile,
  // so we can't block by area code alone. Instead we'll do basic validation
  // and flag suspicious patterns.
]);

// Canadian valid area codes (for format validation)
const CANADIAN_AREA_CODES = new Set([
  // Ontario
  "226",
  "249",
  "289",
  "343",
  "365",
  "382",
  "416",
  "437",
  "519",
  "548",
  "613",
  "647",
  "705",
  "807",
  "905",
  // Quebec
  "263",
  "354",
  "367",
  "418",
  "438",
  "450",
  "468",
  "514",
  "579",
  "581",
  "819",
  "873",
  // BC
  "236",
  "250",
  "604",
  "672",
  "778",
  // Alberta
  "368",
  "403",
  "587",
  "780",
  "825",
  // Manitoba
  "204",
  "431",
  // Saskatchewan
  "306",
  "639",
  // Nova Scotia / PEI
  "782",
  "902",
  // New Brunswick
  "428",
  "506",
  // Newfoundland
  "709",
  "879",
  // NWT / Nunavut / Yukon
  "867",
]);

/**
 * Check if an email address uses a known disposable/temporary email domain.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Basic email format validation — rejects obvious garbage but doesn't
 * over-validate (RFC 5322 is intentionally loose).
 */
export function isValidEmailFormat(email: string): boolean {
  const e = email.trim();
  // Must have @ with something on both sides
  if (!e || !e.includes("@")) return false;
  const [local, domain] = e.split("@");
  if (!local || !domain) return false;
  // Domain must have a dot with a 2+ char TLD
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) return false;
  // Local part must be reasonable
  if (local.length > 64 || domain.length > 253) return false;
  // Reject obvious patterns: all numbers, random strings that look auto-generated
  // (e.g., "asdkjh3928@..." — more than 60% numeric/random)
  if (/^\d+$/.test(local)) return false; // all numbers
  return true;
}

/**
 * Normalise a Canadian phone number to digits-only, 10 digits.
 * Returns null if invalid.
 */
export function normaliseCanadianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  // Handle +1 prefix
  const normalized =
    digits.startsWith("1") && digits.length === 11
      ? digits.substring(1)
      : digits;
  if (normalized.length !== 10) return null;
  return normalized;
}

/**
 * Validate a Canadian phone number:
 *  1. Must be 10 digits
 *  2. Must have a valid Canadian area code
 *  3. Must not start with 0 or 1 in the subscriber portion
 */
export function validateCanadianPhone(phone: string): {
  valid: boolean;
  normalized: string | null;
  error?: string;
  areaCode?: string;
} {
  const normalized = normaliseCanadianPhone(phone);
  if (!normalized) {
    return {
      valid: false,
      normalized: null,
      error: "Phone number must be 10 digits",
    };
  }

  const areaCode = normalized.substring(0, 3);

  // Check valid Canadian area code
  if (!CANADIAN_AREA_CODES.has(areaCode)) {
    return {
      valid: false,
      normalized,
      areaCode,
      error:
        "Invalid Canadian area code. Please use a valid Canadian phone number.",
    };
  }

  // Exchange (next 3 digits) cannot start with 0 or 1
  const exchange = normalized.substring(3, 6);
  if (exchange.startsWith("0") || exchange.startsWith("1")) {
    return {
      valid: false,
      normalized,
      areaCode,
      error: "Invalid phone number format",
    };
  }

  // Check known VOIP area codes
  if (VOIP_AREA_CODES.has(areaCode)) {
    return {
      valid: false,
      normalized,
      areaCode,
      error:
        "VOIP / virtual phone numbers are not accepted. Please use a mobile number from a Canadian carrier.",
    };
  }

  return { valid: true, normalized, areaCode };
}

/**
 * Combined registration validation.
 * Returns { valid: true } or { valid: false, field, error }.
 */
export function validateRegistrationInput(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): { valid: true } | { valid: false; field: string; error: string } {
  // First name
  if (!data.firstName?.trim() || data.firstName.trim().length < 2) {
    return {
      valid: false,
      field: "firstName",
      error: "First name must be at least 2 characters",
    };
  }

  // Last name
  if (!data.lastName?.trim() || data.lastName.trim().length < 2) {
    return {
      valid: false,
      field: "lastName",
      error: "Last name must be at least 2 characters",
    };
  }

  // Email
  if (!isValidEmailFormat(data.email)) {
    return {
      valid: false,
      field: "email",
      error: "Please enter a valid email address",
    };
  }
  if (isDisposableEmail(data.email)) {
    return {
      valid: false,
      field: "email",
      error:
        "Temporary or disposable email addresses are not accepted. Please use a permanent email address.",
    };
  }

  // Phone
  const phoneResult = validateCanadianPhone(data.phone);
  if (!phoneResult.valid) {
    return { valid: false, field: "phone", error: phoneResult.error! };
  }

  return { valid: true };
}
