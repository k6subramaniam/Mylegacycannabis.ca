/**
 * Email Layout Module — single source of truth for all email template structure.
 *
 * ┌─────────────────────────────────────────────┐
 * │  BRAND HEADER (dark bg + logo + stripe)     │ ← BRAND_HEADER
 * ├─────────────────────────────────────────────┤
 * │  [body content here — varies per template]  │
 * ├─────────────────────────────────────────────┤
 * │  FOOTER (dark bg + links)                   │ ← CUSTOMER_FOOTER / ADMIN_FOOTER
 * └─────────────────────────────────────────────┘
 *
 * Usage:
 *   import { emailShell, BRAND_HEADER, CUSTOMER_FOOTER } from './emailLayout';
 *   const html = emailShell('Title', bodyRows, CUSTOMER_FOOTER);
 *
 * The {{logo_url}} placeholder is replaced at send-time by the template engine.
 * The admin can override the logo via Admin → Email Templates → Email Header Logo.
 *
 * To change the header/footer/accent colors for ALL emails, edit this file.
 */

// ─── Brand colours (keep in sync with client theme) ─────────────────
export const BRAND = {
  /** Dark navy background for header/footer */
  headerBg: '#1a1a2e',
  /** Accent stripe — matches the logo's orange/yellow/red bar */
  stripe: 'linear-gradient(90deg, #F5C518 0%, #D4952A 33%, #E8792B 66%, #C42B2B 100%)',
  /** Primary CTA purple */
  purple: '#720eec',
  /** Link/accent orange */
  orange: '#E8792B',
  /** Page background */
  pageBg: '#F5F5F5',
  /** Card background */
  cardBg: '#FFFFFF',
} as const;

// ─── Shared HTML fragments ──────────────────────────────────────────

/**
 * Email header: dark background with logo + accent stripe below.
 * The {{logo_url}} variable is resolved at send-time.
 */
export const BRAND_HEADER = `
                    <!-- LOGO HEADER -->
                    <tr>
                        <td style="background-color:${BRAND.headerBg}; padding:24px 30px; text-align:center; border-radius:8px 8px 0 0;">
                            <a href="https://mylegacycannabis.ca" style="text-decoration:none;">
                                <img src="{{logo_url}}" alt="My Legacy Cannabis" style="max-width:280px; height:auto;" />
                            </a>
                        </td>
                    </tr>
                    <!-- ACCENT STRIPE -->
                    <tr>
                        <td style="height:4px; background:${BRAND.stripe};"></td>
                    </tr>`;

/**
 * Customer-facing footer: logo + tagline + legal links.
 */
export const CUSTOMER_FOOTER = `
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:${BRAND.headerBg}; padding:24px 30px; text-align:center; border-radius:0 0 8px 8px;">
                            <a href="https://mylegacycannabis.ca" style="text-decoration:none;">
                                <img src="{{logo_url}}" alt="My Legacy Cannabis" style="max-width:160px; height:auto; margin-bottom:12px;" />
                            </a>
                            <p style="color:#cccccc; font-size:12px; line-height:1.5; margin:0 0 8px 0;">
                                MyLegacy Cannabis &mdash; GTA's Premier Cannabis Delivery<br>
                                Serving the Greater Toronto Area &bull; 10 AM &ndash; 10 PM Daily
                            </p>
                            <p style="color:#999999; font-size:11px; line-height:1.4; margin:0;">
                                &copy; 2026 MyLegacy Cannabis. All rights reserved.<br>
                                <a href="{{unsubscribe_url}}" style="color:${BRAND.orange}; text-decoration:none;">Unsubscribe</a> &nbsp;|&nbsp;
                                <a href="{{privacy_url}}" style="color:${BRAND.orange}; text-decoration:none;">Privacy Policy</a> &nbsp;|&nbsp;
                                <a href="{{terms_url}}" style="color:${BRAND.orange}; text-decoration:none;">Terms of Service</a>
                            </p>
                        </td>
                    </tr>`;

/**
 * Admin-only footer: minimal, no logo.
 */
export const ADMIN_FOOTER = `
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:${BRAND.headerBg}; padding:20px 30px; text-align:center; border-radius:0 0 8px 8px;">
                            <p style="color:#999999; font-size:12px; line-height:1.5; margin:0;">
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
 *
 * @example
 * ```ts
 * const html = emailShell('Welcome', `
 *   <tr>
 *     <td style="padding:30px;">Hello {{customer_name}}</td>
 *   </tr>
 * `, CUSTOMER_FOOTER);
 * ```
 */
export function emailShell(title: string, bodyRows: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.pageBg}; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
        <tr>
            <td align="center" style="padding:20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.cardBg}; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
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

/** Gradient heading row — used at the top of every template body */
export function headingRow(text: string, gradient = `linear-gradient(135deg, ${BRAND.purple} 0%, #9C27B0 100%)`): string {
  return `
                    <tr>
                        <td style="background:${gradient}; padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">${text}</h1>
                        </td>
                    </tr>`;
}

/** Standard body content row */
export function bodyRow(html: string): string {
  return `
                    <tr>
                        <td style="padding:30px 30px 40px 30px;">
                            ${html}
                        </td>
                    </tr>`;
}

/** CTA button HTML (use inside a bodyRow) */
export function ctaButton(text: string, href = '{{action_url}}', bgColor = BRAND.purple): string {
  return `<div style="text-align:center; margin:24px 0;">
    <a href="${href}" style="display:inline-block; background-color:${bgColor}; color:#FFFFFF; text-decoration:none; padding:15px 40px; border-radius:4px; font-size:16px; font-weight:bold;">${text}</a>
</div>`;
}

/** Info callout box (blue) */
export function infoBox(html: string): string {
  return `<div style="background-color:#E3F2FD; border-left:4px solid #2196F3; padding:20px; margin:20px 0; border-radius:4px;">${html}</div>`;
}

/** Warning callout box (yellow) */
export function warningBox(html: string): string {
  return `<div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:4px;">${html}</div>`;
}

/** Success callout box (green) */
export function successBox(html: string): string {
  return `<div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:4px;">${html}</div>`;
}

/** Contact footer text */
export const CONTACT_LINE = `<p style="color:#888888; font-size:13px; text-align:center; margin-top:24px;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:${BRAND.orange}; text-decoration:none;">support@mylegacycannabis.ca</a></p>`;
