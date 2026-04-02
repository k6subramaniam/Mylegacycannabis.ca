import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { notifyOwner, notifyOwnerAsync } from "./_core/notification";
import { eq } from "drizzle-orm";
import { buildFullUserResponse } from "./userHelpers";
import {
  getHealthDashboard,
  getEmailEvents,
  pingProvider,
  sendTestEmail,
  getAvailableProviders,
} from "./emailHealthMonitor";
import {
  triggerWelcomeEmail,
  triggerOrderConfirmation,
  triggerPaymentReceived,
  triggerIdSubmitted,
  triggerIdApproved,
  triggerIdRejected,
  triggerOrderShipped,
  triggerOrderStatusUpdate,
} from "./emailTemplateEngine";
import { parseMenuImage, applyMenuImport, type ParsedMenuItem, type MenuImportPayload } from "./menuImport";
import { pollETransferEmails, manualMatchPayment, isETransferServiceConfigured } from "./etransferService";
import { invokeLLM, clearAiConfigCache } from "./_core/llm";
import { nanoid as nanoidSmall } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const sessionUser = opts.ctx.user;
      if (!sessionUser) return null;
      // Look up the full user from DB to return enriched data
      const dbUser = await db.getUserById(sessionUser.id);
      if (!dbUser) return null;
      return buildFullUserResponse(dbUser);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
    loginEmail: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      return {
        success: true,
        user: await buildFullUserResponse(user),
      };
    }),
    register: publicProcedure.input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      phone: z.string().min(1),
      birthday: z.string().min(1),
    })).mutation(async ({ input }) => {
      // ─── AGE GATE: must be 19+ ───
      if (input.birthday) {
        const parts = input.birthday.split('-');
        if (parts.length === 3) {
          const birthYear = parseInt(parts[0], 10);
          const birthMonth = parseInt(parts[1], 10) - 1;
          const birthDay = parseInt(parts[2], 10);
          if (!isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
            const today = new Date();
            let age = today.getFullYear() - birthYear;
            if (today.getMonth() < birthMonth || (today.getMonth() === birthMonth && today.getDate() < birthDay)) age--;
            if (age < 19) {
              return { success: false, error: "You must be 19 years of age or older to create an account." };
            }
          }
        }
      }
      const existing = await db.getUserByEmail(input.email);
      if (existing && existing.authMethod === 'email') {
        return { success: false, error: "Email already registered. Please sign in instead." };
      }
      // If user exists via email/OAuth, upgrade to email auth with their new details
      const openId = existing?.openId || `email_${input.email}_${Date.now()}`;
      await db.upsertUser({
        openId,
        email: input.email,
        name: input.name,
        phone: input.phone,
        birthday: input.birthday,
        authMethod: 'email',
        role: existing?.role || 'user',
        rewardPoints: existing?.rewardPoints || 25,
      });
      const newUser = await db.getUserByEmail(input.email);
      if (!newUser) {
        return { success: false, error: "Failed to create user" };
      }
      // Fire-and-forget: send welcome email template
      triggerWelcomeEmail({
        customerName: input.name,
        customerEmail: input.email,
      }).catch(err => console.warn("[Register] Welcome email failed:", err.message));
      return {
        success: true,
        user: await buildFullUserResponse(newUser),
      };
    }),
  }),

  // ─── ADMIN: DASHBOARD ───
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    orderStats: adminProcedure.input(z.object({ days: z.number().default(30) })).query(async ({ input }) => {
      return db.getOrderStats(input.days);
    }),
    topProducts: adminProcedure.input(z.object({ limit: z.number().default(10) })).query(async ({ input }) => {
      return db.getTopProducts(input.limit);
    }),
    activityLog: adminProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(50) })).query(async ({ input }) => {
      return db.getAdminActivityLog(input);
    }),

    // ─── PRODUCTS ───
    products: router({
      list: adminProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        category: z.string().optional(),
        search: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllProducts({ ...input, activeOnly: false });
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getProductById(input.id);
      }),
      create: adminProcedure.input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.enum(["flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories"]),
        strainType: z.enum(["Sativa", "Indica", "Hybrid", "CBD", "N/A"]).optional(),
        price: z.string(),
        weight: z.string().optional(),
        thc: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        image: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().default(0),
        featured: z.boolean().default(false),
        isNew: z.boolean().default(false),
        isActive: z.boolean().default(true),
        flavor: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        const id = await db.createProduct(input as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "create", entityType: "product", entityId: id, details: `Created product: ${input.name}` });
        return { id };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        category: z.enum(["flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories"]).optional(),
        strainType: z.enum(["Sativa", "Indica", "Hybrid", "CBD", "N/A"]).optional(),
        price: z.string().optional(),
        weight: z.string().optional(),
        thc: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        image: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().optional(),
        featured: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isActive: z.boolean().optional(),
        flavor: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateProduct(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update", entityType: "product", entityId: id, details: `Updated product #${id}` });
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.deleteProduct(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "delete", entityType: "product", entityId: input.id, details: `Deleted product #${input.id}` });
        return { success: true };
      }),
      bulkUpdate: adminProcedure.input(z.object({
        ids: z.array(z.number()),
        data: z.object({ isActive: z.boolean().optional(), featured: z.boolean().optional(), stock: z.number().optional() }),
      })).mutation(async ({ input, ctx }) => {
        for (const id of input.ids) {
          await db.updateProduct(id, input.data as any);
        }
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "bulk_update", entityType: "product", details: `Bulk updated ${input.ids.length} products` });
        return { success: true };
      }),
    }),

    // ─── ORDERS ───
    orders: router({
      list: adminProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })).query(async ({ input }) => {
        return db.getAllOrders(input);
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) return null;
        const items = await db.getOrderItems(input.id);
        return { ...order, items };
      }),
      updateStatus: adminProcedure.input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
      })).mutation(async ({ input, ctx }) => {
        const previousOrder = await db.getOrderById(input.id);
        await db.updateOrder(input.id, { status: input.status });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update_status", entityType: "order", entityId: input.id, details: `Changed order #${input.id} status to ${input.status}` });
        await notifyOwner({ title: `Order Status Updated`, content: `Order #${input.id} status changed to ${input.status}` });

        // ─── AUTO-EARN REWARDS on delivered ───
        if (input.status === 'delivered') {
          const pointsResult = await db.awardOrderPoints(input.id);
          if (pointsResult) {
            console.log(`[Rewards] Awarded ${pointsResult.points} points for order #${input.id}`);
          }
        }

        // ─── RESTORE STOCK on cancellation / refund ───
        if ((input.status === 'cancelled' || input.status === 'refunded') && previousOrder && previousOrder.status !== 'cancelled' && previousOrder.status !== 'refunded') {
          await db.restoreStock(input.id);
          console.log(`[Stock] Restored stock for cancelled/refunded order #${input.id}`);
        }

        // Send status update email to customer
        const statusOrder = await db.getOrderById(input.id);
        if (statusOrder && statusOrder.guestEmail) {
          const statusMessages: Record<string, string> = {
            confirmed: "Your order has been confirmed and payment has been verified. We're preparing your order now.",
            processing: "Your order is being prepared and packaged for shipment.",
            shipped: "Your order has been shipped! You'll receive tracking information separately.",
            delivered: "Your order has been delivered. Thank you for shopping with MyLegacy Cannabis! We hope you enjoy your purchase.",
            cancelled: "Your order has been cancelled. If you didn't request this, please contact us immediately at support@mylegacycannabis.ca.",
            refunded: "Your order has been refunded. The refund will be processed within 3-5 business days.",
          };
          const statusMsg = statusMessages[input.status] || `Your order status has been updated to: ${input.status}.`;

          triggerOrderStatusUpdate({
            customerName: statusOrder.guestName || "Customer",
            customerEmail: statusOrder.guestEmail,
            orderId: statusOrder.orderNumber || String(input.id),
            orderStatus: input.status.charAt(0).toUpperCase() + input.status.slice(1),
            statusMessage: statusMsg,
          }).catch(err => console.warn("[Status] Email failed:", err.message));
        }

        return { success: true };
      }),
      updatePayment: adminProcedure.input(z.object({
        id: z.number(),
        paymentStatus: z.enum(["pending", "received", "confirmed", "refunded"]),
      })).mutation(async ({ input, ctx }) => {
        await db.updateOrder(input.id, { paymentStatus: input.paymentStatus });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update_payment", entityType: "order", entityId: input.id, details: `Changed order #${input.id} payment to ${input.paymentStatus}` });

        // Send payment received emails when payment is received or confirmed
        if (input.paymentStatus === "received" || input.paymentStatus === "confirmed") {
          const order = await db.getOrderById(input.id);
          if (order && order.guestEmail) {
            triggerPaymentReceived({
              customerName: order.guestName || "Customer",
              customerEmail: order.guestEmail,
              orderId: order.orderNumber || String(input.id),
              orderTotal: order.total || "0",
              isGuest: true,
            }).catch(err => console.warn("[Payment] Email failed:", err.message));
          }
        }

        return { success: true };
      }),
      addTracking: adminProcedure.input(z.object({
        id: z.number(),
        trackingNumber: z.string()
          .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
          .refine((v) =>
            /^\d{16}$/.test(v) ||          // 16-digit domestic PIN
            /^\d{12}$/.test(v) ||          // 12-digit domestic PIN
            /^[A-Z]{2}\d{9}CA$/.test(v) || // 13-char S10 international (e.g. EE123456789CA)
            /^[A-Z]{2}\d{7}CA$/.test(v),   // 11-char domestic (e.g. AB1234567CA)
            { message: "Invalid Canada Post tracking number. Expected: 16 digits, 12 digits, or 2 letters + digits + CA (11 or 13 chars)." }
          ),
        trackingUrl: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        const trackingUrl = input.trackingUrl || `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${input.trackingNumber}`;
        await db.updateOrder(input.id, { trackingNumber: input.trackingNumber, trackingUrl });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "add_tracking", entityType: "order", entityId: input.id, details: `Added tracking: ${input.trackingNumber}` });

        // Send "Order Shipped" email to customer with tracking info
        const trackOrder = await db.getOrderById(input.id);
        if (trackOrder && trackOrder.guestEmail) {
          triggerOrderShipped({
            customerName: trackOrder.guestName || "Customer",
            customerEmail: trackOrder.guestEmail,
            orderId: trackOrder.orderNumber || String(input.id),
            trackingNumber: input.trackingNumber,
            trackingUrl,
          }).catch(err => console.warn("[Tracking] Email failed:", err.message));
        }

        return { success: true };
      }),
      addNote: adminProcedure.input(z.object({ id: z.number(), note: z.string() })).mutation(async ({ input, ctx }) => {
        const order = await db.getOrderById(input.id);
        const existingNotes = order?.adminNotes || "";
        const timestamp = new Date().toISOString();
        const newNote = `[${timestamp}] ${ctx.user?.name || "Admin"}: ${input.note}`;
        await db.updateOrder(input.id, { adminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote });
        return { success: true };
      }),
    }),

    // ─── ID VERIFICATIONS ───
    verifications: router({
      list: adminProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllVerifications(input);
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getVerificationById(input.id);
      }),
      review: adminProcedure.input(z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        notes: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        await db.updateVerification(input.id, {
          status: input.status,
          reviewedBy: ctx.user?.id || 0,
          reviewedAt: new Date(),
          reviewNotes: input.notes,
        });
        // If approved, mark linked user as verified — by userId or by email
        const verification = await db.getVerificationById(input.id);
        if (input.status === "approved" && verification) {
          if (verification.userId) {
            await db.updateUser(verification.userId, { idVerified: true });
          } else if (verification.guestEmail) {
            // Look up user by email and mark as verified
            const linkedUser = await db.getUserByEmail(verification.guestEmail);
            if (linkedUser) {
              await db.updateUser(linkedUser.id, { idVerified: true });
            }
          }
        }
        // Clear [ID VERIFICATION PENDING] from any orders linked to this verification's email
        if (input.status === "approved" && verification) {
          const email = verification.guestEmail;
          if (email) {
            const allOrders = await db.getAllOrders({ limit: 1000 });
            for (const order of allOrders.data) {
              if (
                order.notes &&
                typeof order.notes === "string" &&
                order.notes.includes("[ID VERIFICATION PENDING]") &&
                order.guestEmail?.toLowerCase() === email.toLowerCase()
              ) {
                const cleanedNotes = order.notes
                  .split("\n")
                  .filter((line: string) => !line.includes("[ID VERIFICATION PENDING]"))
                  .join("\n")
                  .trim() || null;
                await db.updateOrder(order.id, { notes: cleanedNotes } as any);
              }
            }
          }
        }
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: input.status, entityType: "verification", entityId: input.id, details: `${input.status} verification #${input.id}${input.notes ? `: ${input.notes}` : ""}` });
        // Only send ID verification notification emails when the feature is enabled
        const idVerifEnabledReview = await db.isIdVerificationEnabled();
        if (idVerifEnabledReview) {
          await notifyOwner({ title: `ID Verification ${input.status}`, content: `Verification #${input.id} has been ${input.status}` });
        }

        // Send templated customer emails for ID review results
        if (verification && verification.guestEmail) {
          const customerName = verification.guestName || "Customer";
          const customerEmail = verification.guestEmail;
          const isGuest = !verification.userId;

          if (input.status === "approved") {
            triggerIdApproved({ customerName, customerEmail, isGuest }).catch(err =>
              console.warn("[Verification] Approved email failed:", err.message)
            );
          } else if (input.status === "rejected") {
            triggerIdRejected({
              customerName,
              customerEmail,
              rejectionReason: input.notes || "The submitted ID could not be verified.",
              isGuest,
            }).catch(err =>
              console.warn("[Verification] Rejected email failed:", err.message)
            );
          }
        }

        return { success: true };
      }),
    }),

    // ─── SHIPPING ZONES ───
    shipping: router({
      list: adminProcedure.query(async () => {
        return db.getAllShippingZones();
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        rate: z.string().optional(),
        deliveryDays: z.string().optional(),
        isActive: z.boolean().optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateShippingZone(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update", entityType: "shipping_zone", entityId: id, details: `Updated shipping zone #${id}` });
        return { success: true };
      }),
      create: adminProcedure.input(z.object({
        zoneName: z.string(),
        provinces: z.array(z.string()),
        rate: z.string(),
        deliveryDays: z.string(),
        isActive: z.boolean().default(true),
      })).mutation(async ({ input, ctx }) => {
        const id = await db.createShippingZone(input as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "create", entityType: "shipping_zone", entityId: id, details: `Created shipping zone: ${input.zoneName}` });
        return { id };
      }),
    }),

    // ─── EMAIL TEMPLATES ───
    emailTemplates: router({
      list: adminProcedure.query(async () => {
        return db.getAllEmailTemplates();
      }),
      get: adminProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
        return db.getEmailTemplateBySlug(input.slug);
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        subject: z.string().optional(),
        bodyHtml: z.string().optional(),
        isActive: z.boolean().optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateEmailTemplate(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update", entityType: "email_template", entityId: id, details: `Updated email template #${id}` });
        return { success: true };
      }),
      create: adminProcedure.input(z.object({
        slug: z.string(),
        name: z.string(),
        subject: z.string(),
        bodyHtml: z.string(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
      })).mutation(async ({ input, ctx }) => {
        const id = await db.createEmailTemplate(input as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "create", entityType: "email_template", entityId: id, details: `Created email template: ${input.name}` });
        return { id };
      }),

      // ─── AI: GENERATE EMAIL TEMPLATE ───
      aiGenerate: adminProcedure.input(z.object({
        prompt: z.string().min(5).max(2000),
        variables: z.array(z.string()).optional(),
        tone: z.enum(["professional", "friendly", "urgent", "celebratory", "minimal"]).default("professional"),
        audience: z.enum(["customer", "admin"]).default("customer"),
      })).mutation(async ({ input }) => {
        const logoUrl = await db.getSiteSetting("email_logo_url") || "https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png";

        const systemPrompt = `You are an email template designer for MyLegacy Cannabis, a premium cannabis delivery service in the Greater Toronto Area (GTA), Canada.

BRAND CONTEXT:
- Business: MyLegacy Cannabis — GTA's premier cannabis delivery
- Hours: 10 AM – 10 PM Daily
- Payment: Interac e-Transfer
- Support email: support@mylegacycannabis.ca
- Website: https://mylegacycannabis.ca

TEMPLATE STRUCTURE — MANDATORY:
Every email MUST use this exact HTML shell. Do NOT modify the header or footer. Only generate the BODY ROWS that go between the header and footer.

The full email document is wrapped like this:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[TITLE]</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F5F5; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;">
        <tr>
            <td align="center" style="padding:20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    <!-- LOGO HEADER (auto-injected, do NOT include) -->
                    <tr>
                        <td style="background-color:#1a1a2e; padding:24px 30px; text-align:center; border-radius:8px 8px 0 0;">
                            <a href="https://mylegacycannabis.ca" style="text-decoration:none;">
                                <img src="{{logo_url}}" alt="My Legacy Cannabis" style="max-width:280px; height:auto;" />
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:4px; background:linear-gradient(90deg, #F5C518 0%, #D4952A 33%, #E8792B 66%, #C42B2B 100%);"></td>
                    </tr>

                    [YOUR BODY ROWS GO HERE — this is what you generate]

                    <!-- FOOTER (auto-injected, do NOT include) -->
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

YOUR OUTPUT must be the COMPLETE HTML document including the header and footer shown above. Include the full <!DOCTYPE html> wrapper.

DESIGN RULES:
- Use inline CSS only (no <style> blocks) — email clients strip them
- Primary brand purple: #720eec / #4B2D8E
- Accent colors: success #4CAF50, warning #FF9800, danger #F44336, info #2196F3
- Always start body with a colored heading row: <tr><td style="background:linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%); padding:20px 30px; text-align:center;"><h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">HEADING</h1></td></tr>
- Then a body row: <tr><td style="padding:40px 30px;">...content...</td></tr>
- Use {{variable_name}} placeholders for dynamic content
- CTA buttons: <a href="{{action_url}}" style="display:inline-block; background-color:#720eec; color:#FFFFFF; text-decoration:none; padding:15px 40px; border-radius:4px; font-size:16px; font-weight:bold;">Button Text</a>
- Info boxes: <div style="background-color:#E3F2FD; border-left:4px solid #2196F3; padding:20px; margin:20px 0; border-radius:4px;">...</div>
- Warning boxes: <div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:4px;">...</div>
- Always end with: Questions? Contact us at support@mylegacycannabis.ca
- Do NOT use emoji characters in the HTML

AVAILABLE TEMPLATE VARIABLES (use ONLY these — the engine auto-injects logo_url, unsubscribe_url, privacy_url, terms_url):
- {{customer_name}} — recipient's name
- {{order_id}} — order number (e.g. MLC-1042)
- {{order_total}} — dollar amount with $
- {{order_items}} — HTML list of line items
- {{delivery_address}} — shipping address
- {{payment_amount}} — e-Transfer amount
- {{payment_reference}} — payment reference code
- {{tracking_number}} — Canada Post tracking number
- {{tracking_url}} — link to track package
- {{order_status}} — current order status text
- {{update_date}} — date/time of status change
- {{status_message}} — description of what happened
- {{rejection_reason}} — why ID was rejected
- {{shop_url}} — link to the shop
- {{account_url}} — link to user account
- {{action_url}} — generic CTA link
- {{logo_url}} — brand logo image URL (auto-injected)
- {{unsubscribe_url}}, {{privacy_url}}, {{terms_url}} — footer links (auto-injected)
You may also introduce NEW custom variables using the {{new_variable_name}} format if the admin's request requires information not covered above.

RESPONSE FORMAT — return valid JSON only, no markdown:
{
  "slug": "kebab-case-slug",
  "name": "Human Readable Name",
  "subject": "Subject line with {{variables}}",
  "bodyHtml": "COMPLETE HTML document string",
  "variables": ["array","of","variable","names","used"]
}`;

        const userMessage = `Generate an email template with these requirements:

PROMPT: ${input.prompt}
TONE: ${input.tone}
AUDIENCE: ${input.audience}
${input.variables && input.variables.length > 0 ? `MUST USE THESE VARIABLES: ${input.variables.join(", ")}` : ""}

Return ONLY the JSON object, no extra text or markdown fences.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          responseFormat: { type: "json_object" },
          maxTokens: 16384,
        });

        const content = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";

        if (!content) {
          throw new Error("AI returned an empty response — please try again");
        }

        // Parse JSON — strip markdown fences if present
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("[AI Generate] Failed to parse AI response:", cleaned.slice(0, 500));
          throw new Error("AI returned invalid JSON — please try again with a simpler prompt");
        }

        // Validate required fields
        if (!parsed.slug || !parsed.name || !parsed.subject || !parsed.bodyHtml) {
          throw new Error("AI returned incomplete template — missing slug, name, subject, or bodyHtml");
        }

        return {
          slug: String(parsed.slug),
          name: String(parsed.name),
          subject: String(parsed.subject),
          bodyHtml: String(parsed.bodyHtml),
          variables: Array.isArray(parsed.variables) ? parsed.variables.map(String) : [],
        };
      }),

      // ─── AI: IMPROVE EXISTING TEMPLATE ───
      aiImprove: adminProcedure.input(z.object({
        currentSubject: z.string(),
        currentBodyHtml: z.string(),
        currentVariables: z.array(z.string()),
        instruction: z.string().min(5).max(2000),
      })).mutation(async ({ input }) => {
        const systemPrompt = `You are an email template designer for MyLegacy Cannabis, a premium cannabis delivery service in the GTA, Canada.

You will be given an EXISTING email template and an instruction to improve it. Return the improved version.

RULES:
- Keep the exact same HTML shell structure (<!DOCTYPE html> wrapper, header with logo, accent stripe, footer)
- Only modify the CONTENT between header and footer unless specifically asked to change structure
- Preserve all existing {{variable}} placeholders unless told to remove them
- Use inline CSS only — no <style> blocks
- Brand purple: #720eec / #4B2D8E
- Do NOT use emoji characters
- Keep the same slug/name unless the admin asks for a rename

RESPONSE FORMAT — return valid JSON only, no markdown:
{
  "subject": "Improved subject line with {{variables}}",
  "bodyHtml": "COMPLETE improved HTML document",
  "variables": ["array","of","all","variable","names","used"]
}`;

        const userMessage = `Here is the current template:

SUBJECT: ${input.currentSubject}

HTML BODY:
${input.currentBodyHtml}

CURRENT VARIABLES: ${input.currentVariables.join(", ")}

ADMIN INSTRUCTION: ${input.instruction}

Return ONLY the JSON object with the improved template.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          responseFormat: { type: "json_object" },
          maxTokens: 16384,
        });

        const content = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";

        if (!content) {
          throw new Error("AI returned an empty response — please try again");
        }

        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("[AI Improve] Failed to parse AI response:", cleaned.slice(0, 500));
          throw new Error("AI returned invalid JSON — please try again with different instructions");
        }

        if (!parsed.subject || !parsed.bodyHtml) {
          throw new Error("AI returned incomplete result — missing subject or bodyHtml");
        }

        return {
          subject: String(parsed.subject),
          bodyHtml: String(parsed.bodyHtml),
          variables: Array.isArray(parsed.variables) ? parsed.variables.map(String) : input.currentVariables,
        };
      }),
    }),

    // ─── SITE SETTINGS ───
    settings: router({
      getAll: adminProcedure.query(async () => {
        return db.getAllSiteSettings();
      }),
      update: adminProcedure.input(z.object({
        key: z.string(),
        value: z.string(),
      })).mutation(async ({ input, ctx }) => {
        await db.setSiteSetting(input.key, input.value);
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "update",
          entityType: "site_setting",
          entityId: 0,
          details: `Updated setting "${input.key}" to "${input.value}"`,
        });
        return { success: true };
      }),
    }),

    // ─── EMAIL HEALTH MONITOR ───
    emailHealth: router({
      /** Real-time dashboard: status, uptime %, totals, streak, last events */
      dashboard: adminProcedure.query(() => {
        return getHealthDashboard();
      }),

      /** Paginated event log with optional status filter */
      events: adminProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.enum(["sent", "failed", "bounced"]).optional(),
      })).query(({ input }) => {
        return getEmailEvents(input);
      }),

      /** Ping a specific provider (resend, smtp, sendgrid, mailgun, ses) */
      ping: adminProcedure.input(z.object({
        provider: z.string(),
      })).mutation(async ({ input }) => {
        return pingProvider(input.provider);
      }),

      /** Send a real test email to verify end-to-end delivery */
      sendTest: adminProcedure.input(z.object({
        to: z.string().email(),
      })).mutation(async ({ input }) => {
        return sendTestEmail(input.to);
      }),

      /** List all known providers and their configuration status */
      providers: adminProcedure.query(() => {
        return getAvailableProviders();
      }),
    }),

    // ─── USERS ───
    users: router({
      list: adminProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllUsers(input.page, input.limit, input.search);
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getUserById(input.id);
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        birthday: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
        adminNotes: z.string().optional(),
        idVerified: z.boolean().optional(),
        rewardPoints: z.number().int().min(0).optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateUser(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update", entityType: "user", entityId: id, details: `Updated customer #${id}` });
        return { success: true };
      }),
      lock: adminProcedure.input(z.object({
        id: z.number(),
        locked: z.boolean(),
        reason: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.id);
        if (!user) throw new Error("User not found");
        const existingNotes = (user as any).adminNotes || "";
        const lockNote = input.locked
          ? `[LOCKED ${new Date().toLocaleString("en-CA")}]${input.reason ? ": " + input.reason : ""}`
          : `[UNLOCKED ${new Date().toLocaleString("en-CA")}]`;
        const newNotes = existingNotes ? `${existingNotes}\n${lockNote}` : lockNote;
        await db.updateUser(input.id, { isLocked: input.locked, adminNotes: newNotes } as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: input.locked ? "lock" : "unlock", entityType: "user", entityId: input.id, details: `${input.locked ? "Locked" : "Unlocked"} customer #${input.id}${input.reason ? ": " + input.reason : ""}` });
        return { success: true };
      }),
      resetPassword: adminProcedure.input(z.object({
        id: z.number(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })).mutation(async ({ input, ctx }) => {
        // Store hashed-equivalent — for OTP-based auth, we store a forced OTP reset note
        // In production this would hash & store a password. For now we log the action and
        // invalidate all sessions by updating the user record timestamp.
        const user = await db.getUserById(input.id);
        if (!user) throw new Error("User not found");
        const existingNotes = (user as any).adminNotes || "";
        const resetNote = `[PASSWORD RESET by admin ${new Date().toLocaleString("en-CA")}]`;
        await db.updateUser(input.id, {
          adminNotes: existingNotes ? `${existingNotes}\n${resetNote}` : resetNote,
          lastSignedIn: new Date(), // bumps updatedAt to invalidate any cached sessions
        } as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "reset_password", entityType: "user", entityId: input.id, details: `Reset password for customer #${input.id}` });
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({
        id: z.number(),
        confirm: z.literal(true),
      })).mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.id);
        if (!user) throw new Error("User not found");
        await db.deleteUser(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "delete", entityType: "user", entityId: input.id, details: `Deleted customer #${input.id} (${user.email || user.phone || "unknown"})` });
        return { success: true };
      }),
      adjustPoints: adminProcedure.input(z.object({
        id: z.number(),
        delta: z.number().int(),
        reason: z.string().min(1, "Reason is required"),
      })).mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.id);
        if (!user) throw new Error("User not found");
        const newPoints = Math.max(0, (user.rewardPoints || 0) + input.delta);
        await db.updateUser(input.id, { rewardPoints: newPoints } as any);
        await db.addRewardsHistory({ userId: input.id, points: input.delta, type: input.delta >= 0 ? "admin_add" : "admin_deduct", description: `Admin adjustment: ${input.reason}` } as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "adjust_points", entityType: "user", entityId: input.id, details: `Adjusted points for #${input.id} by ${input.delta > 0 ? "+" : ""}${input.delta}: ${input.reason}` });
        return { success: true, newPoints };
      }),
      orders: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getUserOrders(input.id);
      }),
    }),

    // ─── FILE UPLOAD ───
    upload: adminProcedure.input(z.object({
      fileName: z.string(),
      base64: z.string(),
      contentType: z.string(),
    })).mutation(async ({ input }) => {
      const ext = input.fileName.split('.').pop() || 'bin';
      const key = `uploads/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.base64, 'base64');
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url, key };
    }),

    // ─── COUPONS ───
    coupons: router({
      list: adminProcedure.query(async () => {
        return db.getAllCoupons();
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getCouponById(input.id);
      }),
      create: adminProcedure.input(z.object({
        code: z.string().min(1).transform(v => v.toUpperCase().replace(/\s/g, '')),
        name: z.string().min(1),
        type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
        value: z.string(),
        minOrderAmount: z.string().optional(),
        maxDiscount: z.string().optional(),
        usageLimit: z.number().optional(),
        perUserLimit: z.number().default(1),
        isActive: z.boolean().default(true),
        startsAt: z.date().optional(),
        expiresAt: z.date().optional(),
      })).mutation(async ({ input, ctx }) => {
        const id = await db.createCoupon(input as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'create', entityType: 'coupon', entityId: id, details: `Created coupon: ${input.code}` });
        return { id };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        type: z.enum(['percentage', 'fixed_amount', 'free_shipping']).optional(),
        value: z.string().optional(),
        minOrderAmount: z.string().optional(),
        maxDiscount: z.string().optional(),
        usageLimit: z.number().optional(),
        perUserLimit: z.number().optional(),
        isActive: z.boolean().optional(),
        startsAt: z.date().optional(),
        expiresAt: z.date().optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateCoupon(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'update', entityType: 'coupon', entityId: id, details: `Updated coupon #${id}` });
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.deleteCoupon(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'delete', entityType: 'coupon', entityId: input.id, details: `Deleted coupon #${input.id}` });
        return { success: true };
      }),
    }),

    // ─── REVIEWS ───
    reviews: router({
      list: adminProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(50) })).query(async ({ input }) => {
        return db.getAllReviews(input);
      }),
      get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getReviewById(input.id);
      }),
      approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.approveReview(input.id);
        // Award review bonus points (10 pts) if not already awarded
        const REVIEW_BONUS = 10;
        const review = await db.getReviewById(input.id);
        if (review && !review.pointsAwarded) {
          const user = await db.getUserById(review.userId);
          if (user) {
            await db.updateUser(user.id, { rewardPoints: (user.rewardPoints || 0) + REVIEW_BONUS } as any);
            await db.addRewardsHistory({ userId: user.id, points: REVIEW_BONUS, type: 'review' as any, description: 'Review bonus: +10 points for approved product review' } as any);
            await db.updateReviewPointsAwarded(input.id);
          }
        }
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'approve', entityType: 'review', entityId: input.id, details: `Approved review #${input.id}` });
        return { success: true };
      }),
      unapprove: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.updateProductReview(input.id, { isApproved: false } as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'unapprove', entityType: 'review', entityId: input.id, details: `Unapproved review #${input.id}` });
        return { success: true };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        rating: z.number().min(1).max(5).optional(),
        title: z.string().max(255).optional(),
        body: z.string().max(2000).optional(),
        tags: z.array(z.string()).optional(),
        strengthRating: z.number().min(1).max(5).optional(),
        smoothnessRating: z.number().min(1).max(5).optional(),
        effectTags: z.array(z.string()).optional(),
        experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']).optional(),
        usageTiming: z.enum(['daytime', 'nighttime', 'anytime']).optional(),
        wouldRecommend: z.boolean().optional(),
        isApproved: z.boolean().optional(),
      })).mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateProductReview(id, data as any);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'update', entityType: 'review', entityId: id, details: `Updated review #${id}` });
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.deleteProductReview(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || 'Admin', action: 'delete', entityType: 'review', entityId: input.id, details: `Deleted review #${input.id}` });
        return { success: true };
      }),
    }),

    // ─── MENU IMPORT (AI-powered product import from menu photos) ───
    menuImport: router({
      /** Parse a menu image using AI vision → return structured product list for review */
      parse: adminProcedure.input(z.object({
        imageBase64: z.string().min(100, "Image data is too small"),
        mimeType: z.string().default("image/png"),
      })).mutation(async ({ input, ctx }) => {
        try {
          const items = await parseMenuImage(input.imageBase64, input.mimeType);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "menu_parse",
            entityType: "product",
            details: `Parsed menu image: ${items.length} products extracted`,
          });
          return { success: true, items, count: items.length };
        } catch (err: any) {
          console.error("[MenuImport] Parse error:", err.message);
          return { success: false, items: [] as ParsedMenuItem[], count: 0, error: err.message };
        }
      }),

      /** Apply confirmed import — create/update products, optionally deactivate old ones */
      confirm: adminProcedure.input(z.object({
        items: z.array(z.object({
          category: z.string(),
          grade: z.string(),
          strain: z.string(),
          thc: z.string(),
          isNew: z.boolean(),
          prices: z.object({
            "1g": z.string().nullable().optional(),
            "3.5g": z.string().nullable().optional(),
            "7g": z.string().nullable().optional(),
            "14g": z.string().nullable().optional(),
            "28g": z.string().nullable().optional(),
          }),
          stock: z.number().min(0).default(10),
          include: z.boolean().default(true),
        })),
        deactivateOldFlower: z.boolean().default(false),
        defaultStock: z.number().min(0).default(10),
      })).mutation(async ({ input, ctx }) => {
        const result = await applyMenuImport(input as MenuImportPayload);
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "menu_import",
          entityType: "product",
          details: `Menu import applied: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated, ${result.skipped} skipped`,
        });
        return { success: true, ...result };
      }),
    }),

    // ─── EMAIL LOGO ───
    emailLogo: router({
      get: adminProcedure.query(async () => {
        const url = await db.getSiteSetting("email_logo_url");
        return { url: url || "https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png" };
      }),
      update: adminProcedure.input(z.object({
        url: z.string().url(),
      })).mutation(async ({ input, ctx }) => {
        await db.setSiteSetting("email_logo_url", input.url);
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "update_email_logo",
          entityType: "site_setting",
          entityId: 0,
          details: `Updated email logo URL`,
        });
        return { success: true, url: input.url };
      }),
    }),

    // ─── AI CONFIGURATION ───
    aiConfig: router({
      get: adminProcedure.query(async () => {
        const [provider, apiKey, model] = await Promise.all([
          db.getSiteSetting("ai_provider"),
          db.getSiteSetting("ai_api_key"),
          db.getSiteSetting("ai_model"),
        ]);
        return {
          provider: provider || "openai",
          apiKeySet: !!apiKey,
          apiKeyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
          model: model || "",
        };
      }),
      update: adminProcedure.input(z.object({
        provider: z.enum(["openai", "gemini"]),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        await db.setSiteSetting("ai_provider", input.provider);
        if (input.apiKey !== undefined && input.apiKey !== "") {
          await db.setSiteSetting("ai_api_key", input.apiKey);
        }
        if (input.model !== undefined) {
          await db.setSiteSetting("ai_model", input.model);
        }
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "update_ai_config",
          entityType: "site_setting",
          entityId: 0,
          details: `Updated AI provider to ${input.provider}${input.model ? ` (model: ${input.model})` : ""}`,
        });
        clearAiConfigCache();
        return { success: true };
      }),
      test: adminProcedure.mutation(async () => {
        // Import getAiConfig dynamically to avoid circular deps
        const { getAiConfig } = await import("./_core/llm");
        const config = await getAiConfig();

        if (!config.apiKey) {
          return { success: false, error: "No API key configured. Please set an API key first." };
        }

        try {
          const startTime = Date.now();

          if (config.provider === "gemini") {
            // Test Gemini API directly
            const model = config.model || "gemini-2.5-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
            const resp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
                generationConfig: { maxOutputTokens: 10 },
              }),
            });
            const latency = Date.now() - startTime;
            if (!resp.ok) {
              const errText = await resp.text();
              return { success: false, error: `Gemini API error ${resp.status}: ${errText.slice(0, 200)}` };
            }
            const data = await resp.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            return { success: true, latency, model, reply: reply.trim() };
          } else {
            // Test OpenAI-compatible API
            const baseUrl = config.baseUrl || "https://api.openai.com/v1";
            const model = config.model || "gpt-4o-mini";
            const resp = await fetch(`${baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: "Reply with exactly: OK" }],
                max_tokens: 10,
              }),
            });
            const latency = Date.now() - startTime;
            if (!resp.ok) {
              const errText = await resp.text();
              return { success: false, error: `OpenAI API error ${resp.status}: ${errText.slice(0, 200)}` };
            }
            const data = await resp.json();
            const reply = data.choices?.[0]?.message?.content || "";
            return { success: true, latency, model, reply: reply.trim() };
          }
        } catch (err: any) {
          return { success: false, error: err.message || "Connection failed" };
        }
      }),
    }),
  }),

  // ─── PUBLIC: STOREFRONT API ───
  store: router({
    // ─── UPDATE PROFILE (authenticated users) ───
    updateProfile: protectedProcedure.input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      birthday: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // ─── CUSTOMERS CANNOT EDIT THEIR OWN PROFILE ───
      // Only admins can update customer details via the admin panel.
      throw new Error("Profile changes are locked. Please contact support@mylegacycannabis.ca to update your details.");
    }),

    // ─── REFRESH USER (authenticated users — re-fetch latest data incl. ID verification status) ───
    refreshUser: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return null;
      const dbUser = await db.getUserById(userId);
      if (!dbUser) return null;
      return buildFullUserResponse(dbUser);
    }),

    siteConfig: publicProcedure.query(async () => {
      const [idVerificationEnabled, maintenance, storeHoursConfig, paymentEmail, emailLogoUrl] = await Promise.all([
        db.isIdVerificationEnabled(),
        db.getMaintenanceConfig(),
        db.getStoreHoursConfig(),
        db.getSiteSetting("payment_email"),
        db.getSiteSetting("email_logo_url"),
      ]);
      return {
        idVerificationEnabled,
        maintenance,
        storeHours: storeHoursConfig,
        paymentEmail: paymentEmail || process.env.GMAIL_PAYMENT_EMAIL || "payments@mylegacycannabis.ca",
        emailLogoUrl: emailLogoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png",
      };
    }),
    products: publicProcedure.input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      category: z.string().optional(),
      search: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getAllProducts({ ...input, activeOnly: true });
    }),
    product: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      return db.getProductBySlug(input.slug);
    }),
    shippingZones: publicProcedure.query(async () => {
      return db.getAllShippingZones();
    }),
    submitOrder: publicProcedure.input(z.object({
      guestEmail: z.string().email(),
      guestName: z.string(),
      guestPhone: z.string().optional(),
      items: z.array(z.object({
        productId: z.any().optional().transform(v => { const n = Number(v); return isNaN(n) ? undefined : n; }),
        productName: z.string(),
        productImage: z.string().optional(),
        quantity: z.number(),
        price: z.string(),
      })),
      subtotal: z.string(),
      shippingCost: z.string(),
      discount: z.string().default("0"),
      pointsRedeemed: z.number().default(0),
      total: z.string(),
      shippingAddress: z.object({
        street: z.string(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string(),
        country: z.string().default("Canada"),
      }),
      shippingZone: z.string().optional(),
      notes: z.string().optional(),
      couponCode: z.string().optional(),
    })).mutation(async ({ input }) => {
      // ─── OUT-OF-STOCK GUARD ───
      const stockIssues = await db.checkStock(input.items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })));
      if (stockIssues.length > 0) {
        throw new Error(`Out of stock: ${stockIssues.join(', ')}`);
      }

      // ─── COUPON VALIDATION ───
      let couponDiscount = '0';
      let couponCode: string | undefined;
      if (input.couponCode) {
        const couponResult = await db.validateCoupon(input.couponCode, parseFloat(input.subtotal), input.guestEmail);
        if (!couponResult.valid) {
          throw new Error(couponResult.error || 'Invalid coupon code.');
        }
        couponDiscount = couponResult.discount.toFixed(2);
        couponCode = input.couponCode.toUpperCase();
      }

      const orderNumber = `ML-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
      const orderId = await db.createOrder({
        orderNumber,
        guestEmail: input.guestEmail,
        guestName: input.guestName,
        guestPhone: input.guestPhone,
        subtotal: input.subtotal,
        shippingCost: input.shippingCost,
        discount: input.discount,
        pointsRedeemed: input.pointsRedeemed,
        total: input.total,
        shippingAddress: input.shippingAddress,
        shippingZone: input.shippingZone,
        notes: input.notes,
        couponCode,
        couponDiscount,
        status: "pending",
        paymentStatus: "pending",
      } as any);
      await db.createOrderItems(input.items.map(item => ({
        orderId,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: item.price,
      })));

      // ─── STOCK DECREMENT ───
      await db.decrementStock(input.items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })));

      // ─── RECORD COUPON USAGE ───
      if (couponCode) {
        const coupon = await db.getCouponByCode(couponCode);
        if (coupon) {
          await db.recordCouponUsage({ couponId: coupon.id, orderId, email: input.guestEmail });
        }
      }

      // Fire-and-forget — never block the customer's order confirmation
      notifyOwnerAsync({ title: `New Order: ${orderNumber}`, content: `New order from ${input.guestName} (${input.guestEmail}) — Total: $${input.total}` });

      // Send templated order confirmation to customer
      const itemsSummary = input.items.map(i => `${i.quantity}x ${i.productName} ($${i.price})`).join("<br>");
      const addr = input.shippingAddress;
      const addressStr = `${addr.street}, ${addr.city}, ${addr.province} ${addr.postalCode}, ${addr.country}`;
      triggerOrderConfirmation({
        customerName: input.guestName,
        customerEmail: input.guestEmail,
        orderId: orderNumber,
        orderTotal: input.total,
        orderItems: itemsSummary,
        deliveryAddress: addressStr,
        paymentAmount: input.total,
        paymentReference: orderNumber,
        isGuest: true,
      }).catch(err => console.warn("[Order] Confirmation email failed:", err.message));

      return { orderNumber, orderId };
    }),
    // ─── VALIDATE COUPON (public — for checkout preview) ───
    validateCoupon: publicProcedure.input(z.object({
      code: z.string().min(1),
      subtotal: z.number(),
      email: z.string().email(),
    })).query(async ({ input }) => {
      return db.validateCoupon(input.code, input.subtotal, input.email);
    }),
    // ─── SUBMIT PRODUCT REVIEW (authenticated) ───
    submitReview: protectedProcedure.input(z.object({
      productId: z.number(),
      orderId: z.number().optional(),
      rating: z.number().min(1).max(5),
      title: z.string().max(255).optional(),
      body: z.string().max(2000).optional(),
      // Structured recommendation signals
      tags: z.array(z.string()).optional(),
      strengthRating: z.number().min(1).max(5).optional(),
      smoothnessRating: z.number().min(1).max(5).optional(),
      effectTags: z.array(z.string()).optional(),
      experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']).optional(),
      usageTiming: z.enum(['daytime', 'nighttime', 'anytime']).optional(),
      wouldRecommend: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error('Not authenticated');
      // Check for duplicate review on same product
      const existing = await db.getUserReviews(userId);
      if (existing.some((r: any) => r.productId === input.productId)) {
        throw new Error('You have already reviewed this product.');
      }
      // Reviews appear immediately (isApproved = true)
      const id = await db.createProductReview({ userId, ...input, isApproved: true } as any);
      return { id, message: 'Review submitted! Thank you for your feedback.' };
    }),
    // ─── UPDATE OWN REVIEW (authenticated) ───
    updateReview: protectedProcedure.input(z.object({
      reviewId: z.number(),
      rating: z.number().min(1).max(5).optional(),
      title: z.string().max(255).optional(),
      body: z.string().max(2000).optional(),
      tags: z.array(z.string()).optional(),
      strengthRating: z.number().min(1).max(5).optional(),
      smoothnessRating: z.number().min(1).max(5).optional(),
      effectTags: z.array(z.string()).optional(),
      experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']).optional(),
      usageTiming: z.enum(['daytime', 'nighttime', 'anytime']).optional(),
      wouldRecommend: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const review = await db.getReviewById(input.reviewId);
      if (!review) throw new Error('Review not found.');
      if (review.userId !== userId) throw new Error('You can only edit your own reviews.');
      const { reviewId, ...updateData } = input;
      await db.updateProductReview(reviewId, updateData as any);
      return { success: true, message: 'Review updated successfully.' };
    }),
    // ─── GET PRODUCT REVIEWS (public) ───
    productReviews: publicProcedure.input(z.object({ productId: z.number() })).query(async ({ input }) => {
      const reviews = await db.getProductReviews(input.productId);
      // Compute aggregate stats
      const count = reviews.length;
      const avgRating = count > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / count : 0;
      // Aggregate tag counts
      const tagCounts: Record<string, number> = {};
      const effectCounts: Record<string, number> = {};
      let strengthSum = 0, strengthCount = 0;
      let smoothnessSum = 0, smoothnessCount = 0;
      let recommendCount = 0;
      for (const r of reviews as any[]) {
        if (r.tags) for (const t of r.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
        if (r.effectTags) for (const t of r.effectTags) effectCounts[t] = (effectCounts[t] || 0) + 1;
        if (r.strengthRating) { strengthSum += r.strengthRating; strengthCount++; }
        if (r.smoothnessRating) { smoothnessSum += r.smoothnessRating; smoothnessCount++; }
        if (r.wouldRecommend) recommendCount++;
      }
      return {
        reviews,
        aggregate: {
          count,
          avgRating: Math.round(avgRating * 10) / 10,
          avgStrength: strengthCount > 0 ? Math.round((strengthSum / strengthCount) * 10) / 10 : null,
          avgSmoothness: smoothnessCount > 0 ? Math.round((smoothnessSum / smoothnessCount) * 10) / 10 : null,
          recommendPercent: count > 0 ? Math.round((recommendCount / count) * 100) : null,
          topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, ct]) => ({ tag, count: ct })),
          topEffects: Object.entries(effectCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, ct]) => ({ tag, count: ct })),
        },
      };
    }),
    // ─── GET REFERRAL CODE (authenticated) ───
    myReferralCode: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error('Not authenticated');
      let ref = await db.getReferralCodeByUserId(userId);
      if (!ref) {
        // Auto-generate a referral code
        const code = `MLC-${nanoidSmall(6).toUpperCase()}`;
        await db.createReferralCode({ userId, code });
        ref = await db.getReferralCodeByUserId(userId);
      }
      return ref;
    }),
    // ─── APPLY REFERRAL CODE (at registration) ───
    applyReferral: publicProcedure.input(z.object({
      code: z.string().min(1),
      refereeEmail: z.string().email(),
    })).mutation(async ({ input }) => {
      const REFERRAL_BONUS_REFERRER = 50;
      const REFERRAL_BONUS_REFEREE = 25;
      const refCode = await db.getReferralCodeByCode(input.code);
      if (!refCode) return { success: false, error: 'Invalid referral code.' };
      const referee = await db.getUserByEmail(input.refereeEmail);
      if (!referee) return { success: false, error: 'Referee user not found.' };
      if (referee.id === refCode.userId) return { success: false, error: 'Cannot refer yourself.' };
      // Award points to both
      const referrer = await db.getUserById(refCode.userId);
      if (referrer) {
        await db.updateUser(referrer.id, { rewardPoints: (referrer.rewardPoints || 0) + REFERRAL_BONUS_REFERRER } as any);
        await db.addRewardsHistory({ userId: referrer.id, points: REFERRAL_BONUS_REFERRER, type: 'referral' as any, description: `Referral bonus: ${referee.name || referee.email} joined using your code` } as any);
      }
      await db.updateUser(referee.id, { rewardPoints: (referee.rewardPoints || 0) + REFERRAL_BONUS_REFEREE, referredBy: refCode.userId } as any);
      await db.addRewardsHistory({ userId: referee.id, points: REFERRAL_BONUS_REFEREE, type: 'referral' as any, description: `Welcome bonus: Used referral code ${input.code}` } as any);
      await db.trackReferral({ referrerId: refCode.userId, refereeId: referee.id, referralCodeId: refCode.id, referrerPointsAwarded: true, refereePointsAwarded: true });
      return { success: true, referrerPoints: REFERRAL_BONUS_REFERRER, refereePoints: REFERRAL_BONUS_REFEREE };
    }),
    // ─── REWARDS HISTORY (authenticated) ───
    rewardsHistory: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return [];
      return db.getRewardsHistoryByUser(userId);
    }),
    submitVerification: publicProcedure.input(z.object({
      guestEmail: z.string().optional(),
      guestName: z.string().optional(),
      frontImageBase64: z.string(),
      selfieImageBase64: z.string().optional(),
      idType: z.string().optional(),
      contentType: z.string().default("image/jpeg"),
    })).mutation(async ({ input, ctx }) => {
      // Check if ID verification is enabled
      const idVerifEnabled = await db.isIdVerificationEnabled();
      if (!idVerifEnabled) {
        return { id: 0, status: "skipped" as const, message: "ID verification is not currently required." };
      }
      const frontKey = `id-verifications/${nanoid()}-front.jpg`;
      const frontBuffer = Buffer.from(input.frontImageBase64, 'base64');
      const { url: frontUrl } = await storagePut(frontKey, frontBuffer, input.contentType);
      let selfieUrl: string | undefined;
      if (input.selfieImageBase64) {
        const selfieKey = `id-verifications/${nanoid()}-selfie.jpg`;
        const selfieBuffer = Buffer.from(input.selfieImageBase64, 'base64');
        const result = await storagePut(selfieKey, selfieBuffer, input.contentType);
        selfieUrl = result.url;
      }
      const id = await db.createVerification({
        userId: ctx.user?.id,
        guestEmail: input.guestEmail,
        guestName: input.guestName,
        frontImageUrl: frontUrl,
        selfieImageUrl: selfieUrl,
        idType: input.idType,
      });
      // Fire-and-forget — never block the customer's verification submission
      notifyOwnerAsync({ title: "New ID Verification Submitted", content: `Verification #${id} from ${input.guestName || input.guestEmail || "Guest"} needs review.` });

      // Send templated admin notification
      triggerIdSubmitted({
        customerName: input.guestName || "Guest",
        customerEmail: input.guestEmail || "",
        userId: ctx.user?.id,
        verificationId: id,
        idType: input.idType,
        isGuest: !ctx.user,
      }).catch(err => console.warn("[Verification] Admin email failed:", err.message));

      return { id, status: "pending" };
    }),
  }),

  // ─── E-TRANSFER PAYMENT MATCHING ───
  etransfer: router({
    // Admin: list all payment records
    list: adminProcedure.input(z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      status: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getAllPaymentRecords({
        page: input?.page ?? 1,
        limit: input?.limit ?? 50,
        status: input?.status,
      });
    }),

    // Admin: get pending (unmatched) orders for manual matching dropdown
    pendingOrders: adminProcedure.query(async () => {
      const orders = await db.getPendingETransferOrders();
      return orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        guestName: o.guestName,
        guestEmail: o.guestEmail,
        createdAt: o.createdAt,
      }));
    }),

    // Admin: manually match a payment to an order
    manualMatch: adminProcedure.input(z.object({
      paymentId: z.number(),
      orderId: z.number(),
    })).mutation(async ({ input, ctx }) => {
      const success = await manualMatchPayment(input.paymentId, input.orderId, ctx.user?.id || 0);
      if (!success) throw new Error("Failed to match payment to order");
      // Get the order to update its matched order number
      const order = await db.getOrderById(input.orderId);
      if (order) {
        await db.updatePaymentRecord(input.paymentId, {
          matchedOrderNumber: order.orderNumber,
        } as any);
      }
      await db.logAdminActivity({
        adminId: ctx.user?.id || 0,
        adminName: ctx.user?.name || "Admin",
        action: "etransfer_manual_match",
        entityType: "payment",
        entityId: input.paymentId,
        details: `Manually matched payment #${input.paymentId} to order #${input.orderId}`,
      });
      return { success: true };
    }),

    // Admin: ignore a payment record
    ignore: adminProcedure.input(z.object({
      paymentId: z.number(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updatePaymentRecord(input.paymentId, {
        status: "ignored" as any,
        reviewedBy: ctx.user?.id || 0,
        reviewedAt: new Date(),
        adminNotes: input.notes || "Ignored by admin",
      } as any);
      return { success: true };
    }),

    // Admin: trigger a manual poll
    poll: adminProcedure.mutation(async () => {
      if (!isETransferServiceConfigured()) {
        throw new Error("Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.");
      }
      const stats = await pollETransferEmails();
      return stats;
    }),

    // Admin: check if service is configured + get/set payment email
    status: adminProcedure.query(async () => {
      const savedEmail = await db.getSiteSetting("payment_email");
      return {
        configured: isETransferServiceConfigured(),
        paymentEmail: savedEmail || process.env.GMAIL_PAYMENT_EMAIL || "payments@mylegacycannabis.ca",
      };
    }),

    // Admin: update the customer-facing payment email address
    updatePaymentEmail: adminProcedure.input(z.object({
      email: z.string().email(),
    })).mutation(async ({ input, ctx }) => {
      await db.setSiteSetting("payment_email", input.email);
      await db.logAdminActivity({
        adminId: ctx.user?.id || 0,
        adminName: ctx.user?.name || "Admin",
        action: "update_payment_email",
        entityType: "site_setting",
        entityId: 0,
        details: `Updated payment email to ${input.email}`,
      });
      return { success: true, email: input.email };
    }),
  }),
});

export type AppRouter = typeof appRouter;
