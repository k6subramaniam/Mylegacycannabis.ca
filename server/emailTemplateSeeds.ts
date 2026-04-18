/**
 * Email template seed data — converted from WordPress PHP templates.
 * Each template uses {{variable_name}} placeholders for dynamic content.
 *
 * The {{logo_url}} variable is auto-injected by the template engine from
 * the site_settings "email_logo_url" row (configurable in Admin → Email Templates).
 *
 * IMPORTANT: The shared layout (header, footer, accent stripe, shell) lives in
 * `emailLayout.ts`. Edit that file to change the look of ALL emails at once.
 */
import { emailShell, CUSTOMER_FOOTER, ADMIN_FOOTER } from "./emailLayout";

export interface EmailTemplateSeed {
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
}

// ─── Template definitions ───────────────────────────────────────

export const EMAIL_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  // ═══════════════════════════════════════
  // NEWSLETTER WELCOME
  // ═══════════════════════════════════════
  {
    slug: "newsletter-welcome",
    name: "Newsletter Welcome Email",
    subject: "Welcome to the My Legacy Cannabis Newsletter!",
    bodyHtml: emailShell(
      "Welcome to the My Legacy Cannabis Newsletter!",
      `
        <!-- Header Stripe -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #4B2D8E, #7A42A5); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: bold; letter-spacing: -0.5px;">You're In!</h1>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 24px; background-color: #ffffff;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                Thanks for subscribing to the My Legacy Cannabis newsletter! We're thrilled to have you in the loop.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                As a subscriber, you're now on the inside track for everything happening at My Legacy Cannabis.
              </p>

              <!-- Green Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #ECFDF5; border-radius: 8px; border-left: 4px solid #10B981;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #065F46; font-size: 16px; font-weight: bold;">Here's what you can expect from us:</h3>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #065F46; font-size: 15px; line-height: 1.6;">
                      <li style="margin-bottom: 8px;">Weekly deals and specials</li>
                      <li style="margin-bottom: 8px;">New product announcements</li>
                      <li style="margin-bottom: 8px;">Exclusive subscriber-only promotions</li>
                      <li style="margin-bottom: 0;">Community news and events</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="{{shop_url}}" style="display: inline-block; padding: 14px 32px; background-color: #F15929; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">Browse Our Shop</a>
                  </td>
                </tr>
              </table>

              <!-- Blue Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #EFF6FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 8px; color: #1E3A8A; font-size: 16px; font-weight: bold;">Want to earn rewards?</h3>
                    <p style="margin: 0; color: #1E40AF; font-size: 15px; line-height: 1.5;">
                      Create an account to start earning Legacy Points! You'll get <strong>25 bonus points</strong> just for signing up, and earn 1 point for every $1 spent. <a href="{{account_url}}" style="color: #2563EB; text-decoration: underline; font-weight: bold;">Create Account &rarr;</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Support Contact -->
              <p style="margin: 0; font-size: 14px; color: #6B7280; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 24px;">
                Have questions? We're here to help. Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color: #4B2D8E; text-decoration: none; font-weight: bold;">support@mylegacycannabis.ca</a>
              </p>
            </td>
          </tr>
        </table>
      `,
      CUSTOMER_FOOTER
    ),
    variables: [
      "shop_url",
      "logo_url",
      "site_url",
      "account_url",
      "unsubscribe_url",
      "privacy_url",
      "terms_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 1. WELCOME EMAIL
  // ═══════════════════════════════════════
  {
    slug: "welcome-email",
    name: "Welcome Email",
    subject: "Welcome to MyLegacy Cannabis, {{customer_name}}!",
    bodyHtml: emailShell(
      "Welcome to MyLegacy Cannabis",
      `
                    <!-- HEADING -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #4B2DBE 0%, #3A2270 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Welcome to MyLegacy Cannabis!</h1>
                        </td>
                    </tr>
                    <!-- BODY -->
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">
                                Hi <strong>{{customer_name}}</strong>,
                            </p>
                            <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">
                                Thank you for creating an account with MyLegacy Cannabis - GTA's premier cannabis delivery service!
                            </p>
                            <div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 15px 0;">
                                    <strong>NEXT STEP: Verify Your Age</strong>
                                </p>
                                <p style="color:#333333; font-size:14px; line-height:1.6; margin:0 0 10px 0;">
                                    To complete your account setup and start shopping, please upload a valid government-issued ID showing you are 19+ years of age.
                                </p>
                                <p style="color:#666666; font-size:13px; line-height:1.5; margin:0;">
                                    <em>Accepted ID types: Driver's License, Passport, Ontario Photo Card, or Provincial ID</em>
                                </p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{account_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">
                                            Upload Your ID Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color:#E3F2FD; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333333; font-size:14px; line-height:1.6; margin:0 0 10px 0;">
                                    <strong>Your Privacy is Protected:</strong>
                                </p>
                                <ul style="color:#666666; font-size:13px; line-height:1.6; margin:0; padding-left:20px;">
                                    <li>Your ID is encrypted and stored securely</li>
                                    <li>Used only for age verification (required by law)</li>
                                    <li>Never shared with third parties</li>
                                    <li>Verification typically completed within 24 hours</li>
                                </ul>
                            </div>
                            <p style="color:#333333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">
                                Questions? Reply to this email or contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a>
                            </p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "account_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
      "terms_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 2. ADMIN: ID VERIFICATION PENDING
  // ═══════════════════════════════════════
  {
    slug: "admin-id-pending",
    name: "Admin: ID Verification Pending",
    subject: "New ID Verification Required — {{customer_name}}",
    bodyHtml: emailShell(
      "New ID Verification Pending",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F19929 0%, #E8792B 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:22px; font-weight:bold;">New ID Verification Required</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi Admin,</p>
                            <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">
                                A new customer has uploaded their ID for age verification review.
                            </p>
                            <div style="background-color:#FFF3E0; border-left:4px solid #F19929; padding:20px; margin:20px 0; border-radius:8px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Customer:</strong> <span style="color:#666; font-size:14px;">{{customer_name}} ({{customer_email}})</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">User ID:</strong> <span style="color:#666; font-size:14px;">{{user_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Submitted:</strong> <span style="color:#666; font-size:14px;">{{submission_date}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">ID Document:</strong> <span style="color:#666; font-size:14px;">{{id_type}}</span></td></tr>
                                </table>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{admin_review_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">Review ID Document</a>
                                </td></tr>
                            </table>
                            <div style="background-color:#E3F2FD; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Response Time Target:</strong> Please review within 24 hours to maintain excellent customer service.</p>
                            </div>
                            <p style="color:#666; font-size:13px; line-height:1.5; margin:20px 0 0 0;">This is an automated notification from your MyLegacy Cannabis admin dashboard.</p>
                        </td>
                    </tr>`,
      ADMIN_FOOTER
    ),
    variables: [
      "customer_name",
      "customer_email",
      "user_id",
      "submission_date",
      "id_type",
      "admin_review_url",
      "logo_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 3. ID REJECTED
  // ═══════════════════════════════════════
  {
    slug: "id-rejected",
    name: "ID Verification Rejected",
    subject: "ID Verification Update — MyLegacy Cannabis",
    bodyHtml: emailShell(
      "ID Verification Failed - MyLegacy Cannabis",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F44336 0%, #E91E63 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">ID Verification Failed</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">We were unable to verify your age with the ID document you submitted.</p>
                            <div style="background-color:#FFEBEE; border-left:4px solid #F44336; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 15px 0;"><strong>Verification Issue:</strong></p>
                                <p style="color:#666; font-size:14px; line-height:1.6; margin:0;">{{rejection_reason}}</p>
                            </div>
                            <div style="background-color:#FFF9C4; border-left:4px solid #FFC107; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 10px 0;"><strong>Please resubmit with a valid ID showing:</strong></p>
                                <ul style="color:#666; font-size:14px; line-height:1.6; margin:0; padding-left:20px;">
                                    <li>Clear, readable photo (not blurry)</li>
                                    <li>All four corners visible</li>
                                    <li>Your date of birth clearly shown</li>
                                    <li>Document not expired</li>
                                    <li>Government-issued ID (Driver's License, Passport, Ontario Photo Card)</li>
                                </ul>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{resubmit_url}}" style="display:inline-block; background-color:#E53935; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">Upload New ID Document</a>
                                </td></tr>
                            </table>
                            <div style="background-color:#E3F2FD; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:14px; line-height:1.6; margin:0 0 10px 0;"><strong>Tips for a Successful Verification:</strong></p>
                                <ul style="color:#666; font-size:13px; line-height:1.6; margin:0; padding-left:20px;">
                                    <li>Take photo in good lighting</li>
                                    <li>Lay ID flat on a dark surface</li>
                                    <li>Avoid glare or shadows</li>
                                    <li>Capture the entire document</li>
                                    <li>Use a high-resolution camera</li>
                                </ul>
                            </div>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Need help? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "rejection_reason",
      "resubmit_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 4. ID VERIFIED
  // ═══════════════════════════════════════
  {
    slug: "id-verified",
    name: "ID Verification Approved",
    subject: "Your Account is Verified — MyLegacy Cannabis",
    bodyHtml: emailShell(
      "Account Verified - MyLegacy Cannabis",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Your Account is Verified!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Great news! Your ID has been verified and your MyLegacy Cannabis account is now <strong>ACTIVE</strong>.</p>
                            <div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 15px 0;"><strong>You're Ready to Shop!</strong></p>
                                <p style="color:#666; font-size:14px; line-height:1.6; margin:0;">Browse our premium cannabis selection and enjoy fast, discreet delivery across the GTA.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{shop_url}}" style="display:inline-block; background-color:#4CAF50; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">Start Shopping Now</a>
                                </td></tr>
                            </table>
                            <div style="background-color:#E3F2FD; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:14px; line-height:1.6; margin:0 0 10px 0;"><strong>Your Account Benefits:</strong></p>
                                <ul style="color:#666; font-size:13px; line-height:1.6; margin:0; padding-left:20px;">
                                    <li><strong>Earn 1 point per $1</strong> spent on every order</li>
                                    <li>Redeem points for discounts on future orders</li>
                                    <li>Track your order history and deliveries</li>
                                    <li>Save delivery addresses for faster checkout</li>
                                    <li>Exclusive member-only promotions</li>
                                </ul>
                            </div>
                            <div style="background-color:#FFF9C4; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;">
                                    <strong>Delivery Zone:</strong> GTA-wide (Downtown: $5, Scarborough: $10, Mississauga: $12)<br>
                                    <strong>Minimum Order:</strong> $40<br>
                                    <strong>Operating Hours:</strong> 10 AM - 10 PM Daily
                                </p>
                            </div>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "shop_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 5. ORDER CONFIRMATION
  // ═══════════════════════════════════════
  {
    slug: "order-confirmation",
    name: "Order Confirmation",
    subject: "Order Confirmed — #{{order_id}}",
    bodyHtml: emailShell(
      "Order Confirmation",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4B2DBE 0%, #3A2270 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Order Confirmed!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Thank you for your order! We've received your order <strong>#{{order_id}}</strong> and it's ready for payment.</p>
                            <div style="background-color:#E3F2FD; border:2px solid #4A90E2; padding:20px; margin:20px 0; border-radius:8px;">
                                <h3 style="color:#333; margin:0 0 15px 0; font-size:18px;">Order Summary</h3>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order Number:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Total Amount:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                    <tr><td style="padding:10px 0;"><strong style="color:#333; font-size:14px;">Items:</strong><br><span style="color:#666; font-size:13px;">{{order_items}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Delivery Address:</strong><br><span style="color:#666; font-size:13px;">{{delivery_address}}</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:8px;">
                                <h3 style="color:#333; margin:0 0 15px 0; font-size:16px;">Next Step: Send Payment via Interac e-Transfer</h3>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Send To:</strong> <span style="color:#666; font-size:14px;">{{payment_email}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Amount:</strong> <span style="color:#666; font-size:14px;">{{payment_amount}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Reference:</strong> <span style="color:#666; font-size:14px;">{{payment_reference}}</span></td></tr>
                                </table>
                                <div style="background-color:#FFFFFF; border:3px solid #4B2DBE; border-radius:10px; padding:15px; margin:15px 0 0 0; text-align:center;">
                                    <p style="color:#333; font-size:13px; font-weight:bold; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">INCLUDE THIS ORDER NUMBER IN YOUR E-TRANSFER MEMO:</p>
                                    <p style="font-family:monospace; font-size:22px; font-weight:bold; color:#4B2DBE; margin:0; letter-spacing:3px;">{{order_id}}</p>
                                    <p style="color:#888; font-size:11px; margin:8px 0 0 0;">This ensures your payment is matched instantly to your order.</p>
                                </div>
                            </div>
                            <div style="background-color:#FFEBEE; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Payment Deadline:</strong> Please send payment within 24 hours to confirm your order. Orders not paid within 24 hours will be automatically cancelled.</p>
                            </div>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "order_items",
      "delivery_address",
      "payment_amount",
      "payment_reference",
      "payment_email",
      "payment_instructions",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 6. PAYMENT RECEIVED (CUSTOMER)
  // ═══════════════════════════════════════
  {
    slug: "payment-received-customer",
    name: "Payment Received (Customer)",
    subject: "Payment Received — Order #{{order_id}}",
    bodyHtml: emailShell(
      "Payment Received",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Payment Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Great news! We've received your payment for order <strong>#{{order_id}}</strong>. Your order is now confirmed and being prepared.</p>
                            <div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 10px 0;"><strong>Payment Confirmed</strong></p>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Total Paid:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Status:</strong> <span style="color:#4CAF50; font-size:14px; font-weight:bold;">Payment Received</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#E3F2FD; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:14px; line-height:1.6; margin:0;"><strong>What happens next?</strong><br>Our team will process your order and prepare it for shipping. You'll receive a tracking number once your package is on its way via Canada Post.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">View Your Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 7. PAYMENT RECEIVED (ADMIN)
  // ═══════════════════════════════════════
  {
    slug: "payment-received-admin",
    name: "Admin: Payment Received",
    subject: "New Payment Received — Order #{{order_id}}",
    bodyHtml: emailShell(
      "New Payment Received",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F19929 0%, #E8792B 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">New Payment Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi Admin,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">A payment has been received for order <strong>#{{order_id}}</strong>. Please verify the e-Transfer and update the order status.</p>
                            <div style="background-color:#FFF3E0; border-left:4px solid #F19929; padding:20px; margin:20px 0; border-radius:8px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Customer:</strong> <span style="color:#666; font-size:14px;">{{customer_name}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Amount:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Status:</strong> <span style="color:#4CAF50; font-size:14px; font-weight:bold;">Payment Marked Received</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#FFEBEE; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Action Required:</strong> Verify the Interac e-Transfer was deposited, then change order status to "Confirmed" and begin fulfillment.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">Review Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#666; font-size:13px; line-height:1.5; margin:20px 0 0 0;">This is an automated admin notification from MyLegacy Cannabis.</p>
                        </td>
                    </tr>`,
      ADMIN_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 8. GUEST ORDER PLACED
  // ═══════════════════════════════════════
  {
    slug: "guest-order-placed",
    name: "Guest Order Placed",
    subject: "Order Received — #{{order_id}}",
    bodyHtml: emailShell(
      "Order Received",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4B2DBE 0%, #3A2270 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Order Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Thank you for your order with MyLegacy Cannabis! We've received order <strong>#{{order_id}}</strong> and it's ready for payment.</p>
                            <div style="background-color:#E3F2FD; border:2px solid #4A90E2; padding:20px; margin:20px 0; border-radius:8px;">
                                <h3 style="color:#333; margin:0 0 15px 0; font-size:18px;">Order Summary</h3>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order Number:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Total Amount:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:8px;">
                                <h3 style="color:#333; margin:0 0 15px 0; font-size:16px;">Next Step: Send Payment via Interac e-Transfer</h3>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Send To:</strong> <span style="color:#666; font-size:14px;">{{payment_email}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Amount:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Reference:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                </table>
                                <div style="background-color:#FFFFFF; border:3px solid #4B2DBE; border-radius:10px; padding:15px; margin:15px 0 0 0; text-align:center;">
                                    <p style="color:#333; font-size:13px; font-weight:bold; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">INCLUDE THIS ORDER NUMBER IN YOUR E-TRANSFER MEMO:</p>
                                    <p style="font-family:monospace; font-size:22px; font-weight:bold; color:#4B2DBE; margin:0; letter-spacing:3px;">{{order_id}}</p>
                                    <p style="color:#888; font-size:11px; margin:8px 0 0 0;">This ensures your payment is matched instantly to your order.</p>
                                </div>
                            </div>
                            <div style="background-color:#FFEBEE; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Payment Deadline:</strong> Please send payment within 24 hours to confirm your order. Orders not paid within 24 hours may be automatically cancelled.</p>
                            </div>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "payment_amount",
      "payment_reference",
      "payment_email",
      "payment_instructions",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 9. ADMIN: GUEST ID PENDING
  {
    slug: "guest-id-pending-admin",
    name: "Admin: Guest ID Pending",
    subject: "New Guest ID Verification — Order #{{order_id}}",
    bodyHtml: emailShell(
      "New Guest Order",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F19929 0%, #E8792B 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:22px; font-weight:bold;">New Guest Order</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi Admin,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">A guest customer has submitted an ID for age verification. Please review and approve or reject.</p>
                            <div style="background-color:#FFF3E0; border-left:4px solid #F19929; padding:20px; margin:20px 0; border-radius:8px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Guest Customer:</strong> <span style="color:#666; font-size:14px;">{{customer_name}} ({{customer_email}})</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Submitted:</strong> <span style="color:#666; font-size:14px;">{{submission_date}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">ID Type:</strong> <span style="color:#666; font-size:14px;">{{id_type}}</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#E3F2FD; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Response Time Target:</strong> Please review within 24 hours. The customer's order is on hold pending verification.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">Review ID Document</a>
                                </td></tr>
                            </table>
                            <p style="color:#666; font-size:13px; line-height:1.5; margin:20px 0 0 0;">This is an automated admin notification from MyLegacy Cannabis.</p>
                        </td>
                    </tr>`,
      ADMIN_FOOTER
    ),
    variables: [
      "customer_name",
      "customer_email",
      "submission_date",
      "id_type",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 10. GUEST ID REJECTED
  // ═══════════════════════════════════════
  {
    slug: "guest-id-rejected",
    name: "Guest ID Verification Rejected",
    subject: "ID Verification Failed — MyLegacy Cannabis",
    bodyHtml: emailShell(
      "ID Verification Failed",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F44336 0%, #E91E63 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">ID Verification Failed</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Unfortunately, we were unable to verify your age with the ID document you submitted. Your order is on hold until verification is complete.</p>
                            <div style="background-color:#FFEBEE; border-left:4px solid #F44336; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 10px 0;"><strong>Verification Issue:</strong></p>
                                <p style="color:#666; font-size:14px; line-height:1.6; margin:0;">{{rejection_reason}}</p>
                            </div>
                            <div style="background-color:#FFF9C4; border-left:4px solid #FFC107; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 10px 0;"><strong>Please resubmit with a valid ID showing:</strong></p>
                                <ul style="color:#666; font-size:14px; line-height:1.6; margin:0; padding-left:20px;">
                                    <li>Clear, readable photo (not blurry)</li>
                                    <li>All four corners visible</li>
                                    <li>Your date of birth clearly shown</li>
                                    <li>Document not expired</li>
                                    <li>Government-issued ID (Driver's License, Passport, Ontario Photo Card)</li>
                                </ul>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">View Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "rejection_reason",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 11. GUEST ID VERIFIED
  // ═══════════════════════════════════════
  {
    slug: "guest-id-verified",
    name: "Guest ID Verified",
    subject: "ID Verified — Your Order is Being Processed",
    bodyHtml: emailShell(
      "ID Verified",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">ID Verified</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Great news! Your ID has been verified and your order is now being processed.</p>
                            <div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 10px 0;"><strong>Your ID is Verified!</strong></p>
                                <p style="color:#666; font-size:14px; line-height:1.6; margin:0;">Your age verification is complete. If you've already sent payment, your order will be prepared and shipped shortly. You'll receive a tracking number via email once shipped.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">View Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 12. GUEST PAYMENT RECEIVED
  // ═══════════════════════════════════════
  {
    slug: "guest-payment-received",
    name: "Guest Payment Received",
    subject: "Payment Received — Order #{{order_id}}",
    bodyHtml: emailShell(
      "Payment Received",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Payment Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Great news! We've received your payment for order <strong>#{{order_id}}</strong>. Your order is now confirmed and being prepared for shipping.</p>
                            <div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:15px; line-height:1.6; margin:0 0 10px 0;"><strong>Payment Confirmed</strong></p>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Total Paid:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Status:</strong> <span style="color:#4CAF50; font-size:14px; font-weight:bold;">Payment Received</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#E3F2FD; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:14px; line-height:1.6; margin:0;"><strong>What happens next?</strong><br>Our team will process your order and prepare it for shipping via Canada Post. You'll receive a tracking number once your package is on its way.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">View Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 13. ADMIN: GUEST PAYMENT RECEIVED
  // ═══════════════════════════════════════
  {
    slug: "guest-payment-admin",
    name: "Admin: Guest Payment Received",
    subject: "Guest Payment Received — Order #{{order_id}}",
    bodyHtml: emailShell(
      "Guest Payment Received",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #F19929 0%, #E8792B 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Guest Payment Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi Admin,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">A guest customer's payment has been received for order <strong>#{{order_id}}</strong>. Please verify the e-Transfer and begin fulfillment.</p>
                            <div style="background-color:#FFF3E0; border-left:4px solid #F19929; padding:20px; margin:20px 0; border-radius:8px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Guest Customer:</strong> <span style="color:#666; font-size:14px;">{{customer_name}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Amount:</strong> <span style="color:#666; font-size:14px;">{{order_total}}</span></td></tr>
                                </table>
                            </div>
                            <div style="background-color:#FFEBEE; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Action Required:</strong> Verify the Interac e-Transfer, confirm order status, and prepare for shipping.</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,Helvetica,sans-serif;">View Order</a>
                                </td></tr>
                            </table>
                            <p style="color:#666; font-size:13px; line-height:1.5; margin:20px 0 0 0;">This is an automated admin notification from MyLegacy Cannabis.</p>
                        </td>
                    </tr>`,
      ADMIN_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_total",
      "action_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 14. ORDER SHIPPED
  // ═══════════════════════════════════════
  {
    slug: "order-shipped",
    name: "Order Shipped",
    subject: "Your Order Has Shipped — #{{order_id}}",
    bodyHtml: emailShell(
      "Order Shipped",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #2196F3 0%, #03A9F4 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Your Order Has Shipped!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Your order <strong>#{{order_id}}</strong> has been shipped via Canada Post and is on its way to you!</p>
                            <div style="background-color:#E3F2FD; border:2px solid #2196F3; padding:20px; margin:20px 0; border-radius:8px;">
                                <h3 style="color:#333; margin:0 0 15px 0; font-size:18px;">Tracking Information</h3>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Tracking Number:</strong> <a href="{{tracking_url}}" style="color:#4B2DBE; font-size:14px; text-decoration:underline; font-weight:500;">{{tracking_number}}</a></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Carrier:</strong> <span style="color:#666; font-size:14px;">Canada Post</span></td></tr>
                                </table>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
                                <tr><td align="center">
                                    <a href="{{tracking_url}}" style="display:inline-block; background-color:#2196F3; color:#FFFFFF; text-decoration:none; padding:15px 40px; border-radius:8px; font-size:16px; font-weight:bold;">Track Your Package</a>
                                </td></tr>
                            </table>
                            <div style="background-color:#FFF9C4; padding:15px; margin:20px 0; border-radius:8px;">
                                <p style="color:#333; font-size:13px; line-height:1.5; margin:0;"><strong>Estimated Delivery:</strong> Canada Post typically delivers within 2-5 business days depending on your location. Tracking updates may take 24 hours to appear.</p>
                            </div>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "tracking_number",
      "tracking_url",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },

  // ═══════════════════════════════════════
  // 15. ORDER STATUS UPDATE
  // ═══════════════════════════════════════
  {
    slug: "order-status-update",
    name: "Order Status Update",
    subject: "Order Update — #{{order_id}} is now {{order_status}}",
    bodyHtml: emailShell(
      "Order Status Update",
      `
                    <tr>
                        <td style="background:linear-gradient(135deg, #4B2DBE 0%, #3A2270 100%); padding:20px 30px; text-align:center;">
                            <h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">Order Update</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Hi <strong>{{customer_name}}</strong>,</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:0 0 20px 0;">Your order <strong>#{{order_id}}</strong> has been updated.</p>
                            <div style="background-color:#E3F2FD; border-left:4px solid #2196F3; padding:20px; margin:20px 0; border-radius:8px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Order:</strong> <span style="color:#666; font-size:14px;">#{{order_id}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">New Status:</strong> <span style="color:#4B2DBE; font-size:14px; font-weight:bold;">{{order_status}}</span></td></tr>
                                    <tr><td style="padding:5px 0;"><strong style="color:#333; font-size:14px;">Updated:</strong> <span style="color:#666; font-size:14px;">{{update_date}}</span></td></tr>
                                </table>
                            </div>
                            <p style="color:#666; font-size:14px; line-height:1.6; margin:20px 0;">{{status_message}}</p>
                            <p style="color:#333; font-size:16px; line-height:1.6; margin:20px 0 0 0;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>
                        </td>
                    </tr>`,
      CUSTOMER_FOOTER
    ),
    variables: [
      "customer_name",
      "order_id",
      "order_status",
      "update_date",
      "status_message",
      "logo_url",
      "unsubscribe_url",
      "privacy_url",
    ],
    isActive: true,
  },
];
