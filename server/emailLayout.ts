/**
 * Email Layout Module — single source of truth for all email template structure.
 *
 * Based on the 2026 My Legacy CVI Brand Guidelines:
 *   - Primary: Legacy Purple #4B2DBE
 *   - Accent:  Legacy Orange #F19929
 *   - Secondary: #3A2270 (dark purple), #F5A623 (orange light)
 *   - Neutrals: Charcoal #323233, Gray #858481, Light Gray #F5F5F5, White #FFFFFF
 *   - Typography: Bungee (headings), Roboto (body), Roboto Mono (code)
 *   - UI: pill-shaped buttons, rounded cards, purple/white logo backgrounds
 *
 * ┌─────────────────────────────────────────────┐
 * │  BRAND HEADER (purple bg + logo + stripe)   │ ← BRAND_HEADER
 * ├─────────────────────────────────────────────┤
 * │  [body content here — varies per template]  │
 * ├─────────────────────────────────────────────┤
 * │  FOOTER (purple bg + links)                 │ ← CUSTOMER_FOOTER / ADMIN_FOOTER
 * └─────────────────────────────────────────────┘
 *
 * Usage:
 *   import { emailShell, BRAND_HEADER, CUSTOMER_FOOTER } from './emailLayout';
 *   const html = emailShell('Title', bodyRows, CUSTOMER_FOOTER);
 *
 * The {{logo_url}} placeholder is replaced at send-time by the template engine.
 * The admin can override the logo via Admin → Settings → Site Logo.
 *
 * To change the header/footer/accent colors for ALL emails, edit this file.
 */

// ─── Brand colours (2026 MLC Brand Guidelines) ─────────────────────
export const BRAND = {
  /** Legacy Purple — primary brand colour (header/footer bg, CTA) */
  purple: "#4B2DBE",
  /** Legacy Purple Dark — secondary darker purple */
  purpleDark: "#3A2270",
  /** Legacy Orange — accent colour */
  orange: "#F19929",
  /** Orange Light — secondary accent */
  orangeLight: "#F5A623",
  /** Accent stripe — matches the logo's yellow/orange/red bar */
  stripe:
    "linear-gradient(90deg, #F5C518 0%, #F19929 35%, #E8792B 65%, #C42B2B 100%)",
  /** Charcoal — body text */
  charcoal: "#323233",
  /** Gray Medium */
  gray: "#858481",
  /** Page background — light gray */
  pageBg: "#F5F5F5",
  /** Card background — white */
  cardBg: "#FFFFFF",
  /** White */
  white: "#FFFFFF",
} as const;

// ─── Shared HTML fragments ──────────────────────────────────────────

/**
 * Email header: brand purple background with logo + accent stripe below.
 * The {{logo_url}} variable is resolved at send-time.
 */
export const BRAND_HEADER = `
                    <!-- LOGO HEADER -->
                    <tr>
                        <td style="background-color:${BRAND.purpleDark}; padding:28px 30px; text-align:center; border-radius:8px 8px 0 0;">
                            <a href="https://mylegacycannabis.ca" style="text-decoration:none;">
                                <img src="{{logo_url}}" alt="My Legacy Cannabis" style="max-width:260px; height:auto;" />
                            </a>
                        </td>
                    </tr>
                    <!-- ACCENT STRIPE -->
                    <tr>
                        <td style="height:5px; background:${BRAND.stripe};"></td>
                    </tr>`;

/**
 * Customer-facing footer: logo + tagline + legal links.
 */
export const CUSTOMER_FOOTER = `
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:${BRAND.purpleDark}; padding:28px 30px; text-align:center; border-radius:0 0 8px 8px;">
                            <a href="https://mylegacycannabis.ca" style="text-decoration:none;">
                                <img src="{{logo_url}}" alt="My Legacy Cannabis" style="max-width:150px; height:auto; margin-bottom:14px;" />
                            </a>
                            <p style="color:#cccccc; font-size:12px; font-family:'Roboto',Arial,Helvetica,sans-serif; line-height:1.5; margin:0 0 10px 0;">
                                MyLegacy Cannabis &mdash; GTA's Premier Cannabis Delivery<br>
                                Serving the Greater Toronto Area &bull; 10 AM &ndash; 10 PM Daily
                            </p>
                            <p style="color:#999999; font-size:11px; font-family:'Roboto',Arial,Helvetica,sans-serif; line-height:1.4; margin:0;">
                                &copy; 2026 MyLegacy Cannabis. All rights reserved.<br>
                                <a href="{{unsubscribe_url}}" style="color:${BRAND.orangeLight}; text-decoration:none;">Unsubscribe</a> &nbsp;|&nbsp;
                                <a href="{{privacy_url}}" style="color:${BRAND.orangeLight}; text-decoration:none;">Privacy Policy</a> &nbsp;|&nbsp;
                                <a href="{{terms_url}}" style="color:${BRAND.orangeLight}; text-decoration:none;">Terms of Service</a>
                            </p>
                        </td>
                    </tr>`;

/**
 * Admin-only footer: minimal, no logo.
 */
export const ADMIN_FOOTER = `
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:${BRAND.purpleDark}; padding:20px 30px; text-align:center; border-radius:0 0 8px 8px;">
                            <p style="color:#999999; font-size:12px; font-family:'Roboto',Arial,Helvetica,sans-serif; line-height:1.5; margin:0;">
                                MyLegacy Cannabis &mdash; Admin Notification System<br>
                                &copy; 2026 MyLegacy Cannabis. All rights reserved.
                            </p>
                        </td>
                    </tr>`;

// ─── HTML shell builder ─────────────────────────────────────────────

/**
 * Wrap body content in the full email HTML document.
 *
 * @param title - Email <title> tag value
 * @param bodyRows - HTML <tr> rows for the main body
 * @param footer - Which footer to use (CUSTOMER_FOOTER or ADMIN_FOOTER)
 * @returns Complete HTML document string ready for variable replacement
 */
export function emailShell(
  title: string,
  bodyRows: string,
  footer: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${BRAND.pageBg}; font-family:'Roboto',Arial,Helvetica,sans-serif; color:${BRAND.charcoal};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
        <tr>
            <td align="center" style="padding:20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:${BRAND.cardBg}; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    ${BRAND_HEADER}
                    ${bodyRows}
                    ${footer}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── Convenience helpers for building template body rows ────────────

/** Gradient heading row — uses brand purple gradient */
export function headingRow(
  text: string,
  gradient = `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%)`
): string {
  return `
                    <tr>
                        <td style="background:${gradient}; padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:22px; font-weight:bold; font-family:'Roboto',Arial,Helvetica,sans-serif; letter-spacing:0.5px;">${text}</h1>
                        </td>
                    </tr>`;
}

/** Standard body content row */
export function bodyRow(html: string): string {
  return `
                    <tr>
                        <td style="padding:30px 30px 40px 30px; font-family:'Roboto',Arial,Helvetica,sans-serif; color:${BRAND.charcoal};">
                            ${html}
                        </td>
                    </tr>`;
}

/** CTA button HTML — pill-shaped per brand guidelines */
export function ctaButton(
  text: string,
  href = "{{action_url}}",
  bgColor = BRAND.orange
): string {
  return `<div style="text-align:center; margin:28px 0;">
    <a href="${href}" style="display:inline-block; background-color:${bgColor}; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; font-family:'Roboto',Arial,Helvetica,sans-serif; text-transform:uppercase; letter-spacing:0.5px;">${text}</a>
</div>`;
}

/** Info callout box (light purple) */
export function infoBox(html: string): string {
  return `<div style="background-color:#EDE7F6; border-left:4px solid ${BRAND.purple}; padding:20px; margin:20px 0; border-radius:8px; font-family:'Roboto',Arial,Helvetica,sans-serif;">${html}</div>`;
}

/** Warning callout box (light orange) */
export function warningBox(html: string): string {
  return `<div style="background-color:#FFF3E0; border-left:4px solid ${BRAND.orange}; padding:20px; margin:20px 0; border-radius:8px; font-family:'Roboto',Arial,Helvetica,sans-serif;">${html}</div>`;
}

/** Success callout box (green) */
export function successBox(html: string): string {
  return `<div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px; font-family:'Roboto',Arial,Helvetica,sans-serif;">${html}</div>`;
}

/** Danger callout box (red) */
export function dangerBox(html: string): string {
  return `<div style="background-color:#FFEBEE; border-left:4px solid #E53935; padding:20px; margin:20px 0; border-radius:8px; font-family:'Roboto',Arial,Helvetica,sans-serif;">${html}</div>`;
}

/** Contact footer text */
export const CONTACT_LINE = `<p style="color:${BRAND.gray}; font-size:13px; font-family:'Roboto',Arial,Helvetica,sans-serif; text-align:center; margin-top:24px;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:${BRAND.purple}; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>`;
