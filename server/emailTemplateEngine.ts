/**
 * Email Template Engine — loads templates from DB, replaces {{vars}}, sends.
 *
 * This is the bridge between the 13 admin-editable email templates
 * and the actual workflow events (order placed, payment, ID verified, etc.).
 *
 * All customer-facing AND admin-facing emails go through here.
 */

import * as db from "./db";
import { sendCustomerEmail, sendAdminTemplatedEmail } from "./emailService";
import { ENV } from "./_core/env";

// ─── Site URL helper ───
function getSiteUrl(): string {
  // Railway sets RAILWAY_PUBLIC_DOMAIN in production
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  // Fallback for dev
  return process.env.SITE_URL || "https://mylegacycannabisca-production.up.railway.app";
}

// ─── Template variable replacement ───
function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  // Replace any remaining unreplaced variables with empty string
  rendered = rendered.replace(/\{\{[a-z_]+\}\}/g, "");
  return rendered;
}

function renderSubject(subject: string, variables: Record<string, string>): string {
  let rendered = subject;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  rendered = rendered.replace(/\{\{[a-z_]+\}\}/g, "");
  return rendered;
}

// ─── Core: Send a templated email ───

/**
 * Load a template by slug, replace variables, send to recipient.
 * Returns true if sent, false if template not found or inactive or send failed.
 */
export async function sendTemplatedEmail(
  slug: string,
  to: string,
  variables: Record<string, string>,
): Promise<boolean> {
  try {
    const template = await db.getEmailTemplateBySlug(slug);
    if (!template || !template.isActive) {
      console.log(`[TemplateEmail] Template "${slug}" not found or inactive — skipping.`);
      return false;
    }

    const subject = renderSubject(template.subject, variables);
    const html = renderTemplate(template.bodyHtml, variables);

    const isAdminTemplate = slug.includes("admin") || slug.includes("pending-admin");
    if (isAdminTemplate) {
      // Admin templates have full HTML — send raw, don't wrap again
      return sendAdminTemplatedEmail(subject, html);
    }
    return sendCustomerEmail(to, subject, html);
  } catch (err: any) {
    console.error(`[TemplateEmail] Error sending "${slug}" to ${to}:`, err.message);
    return false;
  }
}

/**
 * Send templated email to both admin AND customer.
 * Used for events where both parties need to know (e.g. order placed).
 */
async function sendToAdminAndCustomer(
  adminSlug: string,
  customerSlug: string,
  customerEmail: string,
  variables: Record<string, string>,
): Promise<void> {
  // Admin notification — fire and forget
  sendTemplatedEmail(adminSlug, ENV.adminEmail, variables).catch(err =>
    console.warn(`[TemplateEmail] Admin email "${adminSlug}" failed:`, err.message)
  );
  // Customer email
  sendTemplatedEmail(customerSlug, customerEmail, variables).catch(err =>
    console.warn(`[TemplateEmail] Customer email "${customerSlug}" failed:`, err.message)
  );
}

// ─── Default variable values (common across templates) ───

function commonVars(): Record<string, string> {
  const base = getSiteUrl();
  return {
    unsubscribe_url: `${base}/unsubscribe`,
    privacy_url: `${base}/privacy`,
    terms_url: `${base}/terms`,
  };
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW TRIGGER FUNCTIONS
// Each one maps to specific events in the application lifecycle.
// ═══════════════════════════════════════════════════════════════

// ─── 1. WELCOME EMAIL (on registration) ───
export async function triggerWelcomeEmail(params: {
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const base = getSiteUrl();
  await sendTemplatedEmail("welcome-email", params.customerEmail, {
    customer_name: params.customerName,
    account_url: `${base}/account`,
    ...commonVars(),
  });
}

// ─── 2. ORDER CONFIRMATION (customer submits order) ───
export async function triggerOrderConfirmation(params: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderTotal: string;
  orderItems: string;
  deliveryAddress: string;
  paymentAmount: string;
  paymentReference: string;
  isGuest?: boolean;
}): Promise<void> {
  const base = getSiteUrl();
  const vars = {
    customer_name: params.customerName,
    order_id: params.orderId,
    order_total: `$${params.orderTotal}`,
    order_items: params.orderItems,
    delivery_address: params.deliveryAddress,
    payment_amount: `$${params.paymentAmount}`,
    payment_reference: params.orderId,
    action_url: `${base}/account`,
    ...commonVars(),
  };

  // Customer gets order confirmation
  const customerSlug = params.isGuest ? "guest-order-placed" : "order-confirmation";
  sendTemplatedEmail(customerSlug, params.customerEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] Order confirmation failed:`, err.message)
  );
}

// ─── 3. PAYMENT RECEIVED (admin marks payment as received/confirmed) ───
export async function triggerPaymentReceived(params: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderTotal: string;
  isGuest?: boolean;
}): Promise<void> {
  const base = getSiteUrl();
  const vars = {
    customer_name: params.customerName,
    order_id: params.orderId,
    order_total: `$${params.orderTotal}`,
    action_url: `${base}/admin/orders`,
    ...commonVars(),
  };

  // Customer notification
  const customerSlug = params.isGuest ? "guest-payment-received" : "payment-received-customer";
  sendTemplatedEmail(customerSlug, params.customerEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] Payment customer email failed:`, err.message)
  );

  // Admin notification
  const adminSlug = params.isGuest ? "guest-payment-admin" : "payment-received-admin";
  sendTemplatedEmail(adminSlug, ENV.adminEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] Payment admin email failed:`, err.message)
  );
}

// ─── 4. ID VERIFICATION SUBMITTED (customer uploads ID) ───
export async function triggerIdSubmitted(params: {
  customerName: string;
  customerEmail: string;
  userId?: number;
  verificationId: number;
  idType?: string;
  isGuest?: boolean;
}): Promise<void> {
  const base = getSiteUrl();
  const vars = {
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    user_id: String(params.userId || "Guest"),
    submission_date: new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" }),
    id_type: params.idType || "Government ID",
    admin_review_url: `${base}/admin/verifications`,
    order_id: "",
    order_total: "",
    action_url: `${base}/admin/verifications`,
    ...commonVars(),
  };

  // Admin gets notified
  const adminSlug = params.isGuest ? "guest-id-pending-admin" : "admin-id-pending";
  sendTemplatedEmail(adminSlug, ENV.adminEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] ID pending admin email failed:`, err.message)
  );
}

// ─── 5. ID VERIFICATION APPROVED ───
export async function triggerIdApproved(params: {
  customerName: string;
  customerEmail: string;
  isGuest?: boolean;
}): Promise<void> {
  const base = getSiteUrl();
  const vars = {
    customer_name: params.customerName,
    shop_url: `${base}/shop`,
    order_id: "",
    order_total: "",
    action_url: `${base}/shop`,
    ...commonVars(),
  };

  const slug = params.isGuest ? "guest-id-verified" : "id-verified";
  sendTemplatedEmail(slug, params.customerEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] ID approved email failed:`, err.message)
  );
}

// ─── 6. ORDER SHIPPED (admin adds tracking number) ───
export async function triggerOrderShipped(params: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  trackingNumber: string;
  trackingUrl: string;
}): Promise<void> {
  await sendTemplatedEmail("order-shipped", params.customerEmail, {
    customer_name: params.customerName,
    order_id: params.orderId,
    tracking_number: params.trackingNumber,
    tracking_url: params.trackingUrl,
    ...commonVars(),
  });
}

// ─── 7. ORDER STATUS UPDATE (general status changes) ───
export async function triggerOrderStatusUpdate(params: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderStatus: string;
  statusMessage: string;
}): Promise<void> {
  await sendTemplatedEmail("order-status-update", params.customerEmail, {
    customer_name: params.customerName,
    order_id: params.orderId,
    order_status: params.orderStatus,
    update_date: new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" }),
    status_message: params.statusMessage,
    ...commonVars(),
  });
}

// ─── 8. ID VERIFICATION REJECTED ───
export async function triggerIdRejected(params: {
  customerName: string;
  customerEmail: string;
  rejectionReason: string;
  isGuest?: boolean;
}): Promise<void> {
  const base = getSiteUrl();
  const vars = {
    customer_name: params.customerName,
    rejection_reason: params.rejectionReason || "The submitted ID could not be verified. Please resubmit a clear, valid government-issued photo ID.",
    resubmit_url: `${base}/id-verification`,
    order_id: "",
    order_total: "",
    action_url: `${base}/id-verification`,
    ...commonVars(),
  };

  const slug = params.isGuest ? "guest-id-rejected" : "id-rejected";
  sendTemplatedEmail(slug, params.customerEmail, vars).catch(err =>
    console.warn(`[TemplateEmail] ID rejected email failed:`, err.message)
  );
}
