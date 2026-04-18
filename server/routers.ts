import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { isbot } from "isbot";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { triggerNewsletterWelcomeEmail } from "./emailTemplateEngine";
import {
  lookupGeo,
  getClientIP,
  isOptedOut,
  getGeoCacheStats,
} from "./geolocation";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { notifyOwner, notifyOwnerAsync } from "./_core/notification";
import { eq } from "drizzle-orm";
import { buildFullUserResponse } from "./userHelpers";
import {
  isPushServiceConfigured,
  getVapidPublicKey,
  sendPushToUser,
  broadcastPush,
  notifyOrderStatusChange,
  notifyPaymentReceived,
  notifyTierUpgrade,
  notifyNewProductDrop,
} from "./pushService";
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
  getResolvedCommonVars,
} from "./emailTemplateEngine";
import {
  parseMenuImage,
  applyMenuImport,
  type ParsedMenuItem,
  type MenuImportPayload,
} from "./menuImport";
import {
  pollETransferEmails,
  manualMatchPayment,
  isETransferServiceConfigured,
  getKeywordRules,
  clearKeywordRulesCache,
  DEFAULT_ETRANSFER_INDICATORS_FOR_TEST,
  type KeywordRule,
} from "./etransferService";
import {
  reserveUniqueCentAmount,
  expireOldCentReservations,
} from "./centMatching";
import {
  pollTrackingEmails,
  isTrackingServiceConfigured,
} from "./trackingService";
import {
  getShippingRates,
  getTrackingSummary,
  getTrackingDetails,
  findPostOffices,
  validatePostalCode,
  getOriginPostal,
  isCanadaPostConfigured,
  DOMESTIC_SERVICES,
} from "./canadaPostService";
import { invokeLLM, clearAiConfigCache } from "./_core/llm";
import { nanoid as nanoidSmall } from "nanoid";
import { getMlcBusinessContext } from "./mlcContext";

/** Corporate Visual Identity / Branding DNA — injected into AI email prompts so the
 *  AI understands the brand's look, feel, and design language. */
const MLC_BRAND_DNA = `BRANDING DNA / CORPORATE VISUAL IDENTITY:
- Brand Name: My Legacy Cannabis
- Logo: Horizontal wordmark on dark background (#1a1a2e header). Always fetched from {{logo_url}} site setting.
- Primary Purple: #4B2D8E (buttons, headings, hero sections)
- Secondary Purple: #3A2270 (hover states, dark accents)
- Accent Orange: #F15929 (CTAs, highlights, badges, energy)
- Gold Accent: #F5C518 (premium feel, accent stripe)
- Background: #F5F5F5 (light gray), #FFFFFF (cards)
- Dark Background: #0a0a0a or #1a1a2e (headers, hero sections)
- Typography: Clean sans-serif (Arial/Helvetica fallback). Bold display headings, light body text.
- Accent Stripe: 4px gradient bar under logo — linear-gradient(90deg, #F5C518 0%, #D4952A 33%, #E8792B 66%, #C42B2B 100%)
- Button Style: Rounded pill buttons (border-radius: 50px), bold text, 15px 40px padding
- CTA Primary: bg #F15929, text white, hover darken
- CTA Secondary: bg #4B2D8E, text white
- Info Boxes: bg #E3F2FD, left-border 4px solid #2196F3
- Warning Boxes: bg #FFF59D, left-border 4px solid #FFD700
- Success Boxes: bg #E8F5E9, left-border 4px solid #4CAF50
- Tone: Premium but approachable. Cannabis dispensary professionalism. Not clinical — friendly.
- Footer: Dark background with support email, social links, legal text in small gray type.
- NO emoji characters in emails.`;

export const appRouter = router({
  system: systemRouter,

  // ─── NEWSLETTER ───
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { isNew } = await db.subscribeNewsletter(input.email, "website");
        if (isNew) {
          triggerNewsletterWelcomeEmail({
            subscriberEmail: input.email,
          }).catch(err =>
            console.warn("[Newsletter] Welcome email failed:", err.message)
          );
        }
        return { success: true, isNew };
      }),
  }),

  auth: router({
    me: publicProcedure.query(async opts => {
      const userAgent = opts.ctx.req.headers["user-agent"] || "";
      if (isbot(userAgent)) {
        return null;
      }
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
    loginEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          return { success: false, error: "User not found" };
        }
        return {
          success: true,
          user: await buildFullUserResponse(user),
        };
      }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
          phone: z.string().min(1),
          birthday: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // ─── AGE GATE: must be 19+ ───
        if (input.birthday) {
          const parts = input.birthday.split("-");
          if (parts.length === 3) {
            const birthYear = parseInt(parts[0], 10);
            const birthMonth = parseInt(parts[1], 10) - 1;
            const birthDay = parseInt(parts[2], 10);
            if (!isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
              const today = new Date();
              let age = today.getFullYear() - birthYear;
              if (
                today.getMonth() < birthMonth ||
                (today.getMonth() === birthMonth && today.getDate() < birthDay)
              )
                age--;
              if (age < 19) {
                return {
                  success: false,
                  error:
                    "You must be 19 years of age or older to create an account.",
                };
              }
            }
          }
        }
        const existing = await db.getUserByEmail(input.email);
        if (existing && existing.authMethod === "email") {
          return {
            success: false,
            error: "Email already registered. Please sign in instead.",
          };
        }
        // If user exists via email/OAuth, upgrade to email auth with their new details
        const openId = existing?.openId || `email_${input.email}_${Date.now()}`;
        await db.upsertUser({
          openId,
          email: input.email,
          name: input.name,
          phone: input.phone,
          birthday: input.birthday,
          authMethod: "email",
          role: existing?.role || "user",
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
        }).catch(err =>
          console.warn("[Register] Welcome email failed:", err.message)
        );
        return {
          success: true,
          user: await buildFullUserResponse(newUser),
        };
      }),
  }),

  // ─── ADMIN: DASHBOARD ───
  admin: router({
    // ─── NEWSLETTER ───
    newsletterSubscribers: router({
      list: adminProcedure.query(async () => {
        return db.getAllNewsletterSubscribers();
      }),
      count: adminProcedure.query(async () => {
        return { count: await db.getNewsletterSubscriberCount() };
      }),
    }),

    stats: adminProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    orderStats: adminProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        return db.getOrderStats(input.days);
      }),
    topProducts: adminProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return db.getTopProducts(input.limit);
      }),
    activityLog: adminProcedure
      .input(
        z.object({ page: z.number().default(1), limit: z.number().default(50) })
      )
      .query(async ({ input }) => {
        return db.getAdminActivityLog(input);
      }),

    // ─── PRODUCTS ───
    products: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
            category: z.string().optional(),
            search: z.string().optional(),
          })
        )
        .query(async ({ input }) => {
          return db.getAllProducts({ ...input, activeOnly: false });
        }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getProductById(input.id);
        }),
      create: adminProcedure
        .input(
          z.object({
            name: z.string().min(1),
            slug: z.string().min(1),
            category: z.enum([
              "flower",
              "pre-rolls",
              "edibles",
              "vapes",
              "concentrates",
              "accessories",
              "ounce-deals",
              "shake-n-bake",
            ]),
            strainType: z
              .enum(["Sativa", "Indica", "Hybrid", "CBD", "N/A"])
              .optional(),
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
          })
        )
        .mutation(async ({ input, ctx }) => {
          const id = await db.createProduct(input as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create",
            entityType: "product",
            entityId: id,
            details: `Created product: ${input.name}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { id };
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            slug: z.string().optional(),
            category: z
              .enum([
                "flower",
                "pre-rolls",
                "edibles",
                "vapes",
                "concentrates",
                "accessories",
                "ounce-deals",
                "shake-n-bake",
              ])
              .optional(),
            strainType: z
              .enum(["Sativa", "Indica", "Hybrid", "CBD", "N/A"])
              .optional(),
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
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateProduct(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "product",
            entityId: id,
            details: `Updated product #${id}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteProduct(input.id);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "delete",
            entityType: "product",
            entityId: input.id,
            details: `Deleted product #${input.id}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),
      /** Quick-toggle the featured flag (for homepage featured section).
       *  Enforces a max of 4 featured products — if toggling ON would exceed 4,
       *  the oldest featured product is automatically unfeatured. */
      toggleFeatured: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const product = await db.getProductById(input.id);
          if (!product) throw new Error("Product not found");
          const newVal = !product.featured;
          if (newVal) {
            const currentCount = await db.countFeaturedProducts();
            if (currentCount >= 4) {
              // Auto-unfeature oldest to make room
              await db.unfeatureOldest();
            }
          }
          await db.updateProduct(input.id, {
            featured: newVal,
            updatedAt: new Date(),
          } as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "toggle_featured",
            entityType: "product",
            entityId: input.id,
            details: `${product.name} — featured: ${newVal}`,
          });
          return { success: true, featured: newVal };
        }),
      bulkUpdate: adminProcedure
        .input(
          z.object({
            ids: z.array(z.number()),
            data: z.object({
              isActive: z.boolean().optional(),
              featured: z.boolean().optional(),
              stock: z.number().optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          for (const id of input.ids) {
            await db.updateProduct(id, input.data as any);
          }
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "bulk_update",
            entityType: "product",
            details: `Bulk updated ${input.ids.length} products`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),
    }),

    // ─── ORDERS ───
    orders: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
            status: z.string().optional(),
            search: z.string().optional(),
            dateFrom: z.date().optional(),
            dateTo: z.date().optional(),
          })
        )
        .query(async ({ input }) => {
          return db.getAllOrders(input);
        }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const order = await db.getOrderById(input.id);
          if (!order) return null;
          const items = await db.getOrderItems(input.id);
          // Include linked payment record (if any) for the order detail view
          const paymentRecord = await db.getPaymentRecordByOrderId(input.id);
          return { ...order, items, paymentRecord };
        }),
      updateStatus: adminProcedure
        .input(
          z.object({
            id: z.number(),
            status: z.enum([
              "pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "refunded",
            ]),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const previousOrder = await db.getOrderById(input.id);
          if (!previousOrder) throw new Error("Order not found");

          // ─── PAYMENT GATE (server-enforced) ───
          // Order cannot advance to confirmed/processing/shipped/delivered unless payment is confirmed (or partially_refunded).
          // Exception: cancelled and refunded are always allowed (end states).
          const PAYMENT_GATED_STATUSES = [
            "confirmed",
            "processing",
            "shipped",
            "delivered",
          ];
          const PAYMENT_OK_FOR_ADVANCE = ["confirmed", "partially_refunded"];
          if (
            PAYMENT_GATED_STATUSES.includes(input.status) &&
            !PAYMENT_OK_FOR_ADVANCE.includes(previousOrder.paymentStatus)
          ) {
            throw new Error(
              `Cannot set order to "${input.status}" — payment must be confirmed first (current: ${previousOrder.paymentStatus}).`
            );
          }

          // ─── SHIPPED GATE: only via addTracking ───
          // "Shipped" can ONLY be set by the addTracking mutation (which auto-cascades).
          // This ensures every shipped order has a tracking number.
          if (input.status === "shipped") {
            throw new Error(
              'Cannot manually set status to "Shipped". Add a tracking number instead — it will automatically set the order to Shipped.'
            );
          }

          await db.updateOrder(input.id, { status: input.status });
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update_status",
            entityType: "order",
            entityId: input.id,
            details: `Changed order #${input.id} status to ${input.status}`,
          });
          await notifyOwner({
            title: `Order Status Updated`,
            content: `Order #${input.id} status changed to ${input.status}`,
          });

          // ─── PUSH NOTIFICATION for order status change ───
          if (previousOrder.userId) {
            notifyOrderStatusChange(
              previousOrder.userId,
              previousOrder.orderNumber,
              input.status
            ).catch(err =>
              console.warn(
                "[Push] Order status notification failed:",
                (err as Error).message
              )
            );
          }

          // ─── AUTO-EARN REWARDS on delivered ───
          if (input.status === "delivered") {
            const pointsResult = await db.awardOrderPoints(input.id);
            if (pointsResult) {
              console.log(
                `[Rewards] Awarded ${pointsResult.points} points for order #${input.id}`
              );
            }
          }

          // ─── REFRESH AI MEMORY on meaningful status changes ───
          const AI_REFRESH_STATUSES = [
            "confirmed",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
          ];
          if (AI_REFRESH_STATUSES.includes(input.status)) {
            let memoryUserId = previousOrder.userId;
            // Try to resolve userId from guestEmail if not set on the order
            if (!memoryUserId && previousOrder.guestEmail) {
              const matchedUser = await db.getUserByEmail(
                previousOrder.guestEmail
              );
              if (matchedUser) {
                memoryUserId = matchedUser.id;
                // Back-fill the userId on the order for future lookups
                await db.updateOrder(input.id, {
                  userId: matchedUser.id,
                } as any);
              }
            }
            if (memoryUserId) {
              db.refreshAiUserMemory(memoryUserId).catch(err =>
                console.error(
                  `[AiMemory] Failed to refresh user #${memoryUserId}:`,
                  err
                )
              );
            }
          }

          // ─── RESTORE STOCK on cancellation / refund ───
          if (
            (input.status === "cancelled" || input.status === "refunded") &&
            previousOrder.status !== "cancelled" &&
            previousOrder.status !== "refunded"
          ) {
            await db.restoreStock(input.id);
            console.log(
              `[Stock] Restored stock for cancelled/refunded order #${input.id}`
            );
          }

          // ─── AUTO-CASCADE: Cancel → set payment to refunded (if applicable) ───
          if (
            input.status === "cancelled" &&
            previousOrder.paymentStatus !== "pending"
          ) {
            await db.updateOrder(input.id, {
              paymentStatus: "refunded",
            } as any);
            console.log(
              `[Cascade] Order #${input.id} cancelled → payment set to refunded`
            );
          }

          // ─── AUTO-CASCADE: Refund → clawback reward points + set payment refunded ───
          if (input.status === "refunded") {
            // Clawback points
            const clawback = await db.clawbackOrderPoints(input.id);
            if (clawback) {
              console.log(
                `[Rewards] Clawed back ${clawback.points} points for refunded order #${input.id}`
              );
            }
            // Set payment to refunded
            if (previousOrder.paymentStatus !== "refunded") {
              await db.updateOrder(input.id, {
                paymentStatus: "refunded",
              } as any);
              console.log(
                `[Cascade] Order #${input.id} refunded → payment set to refunded`
              );
            }
          }

          // Send status update email to customer
          const statusOrder = await db.getOrderById(input.id);
          if (statusOrder && statusOrder.guestEmail) {
            const statusMessages: Record<string, string> = {
              confirmed:
                "Your order has been confirmed and payment has been verified. We're preparing your order now.",
              processing:
                "Your order is being prepared and packaged for shipment.",
              shipped:
                "Your order has been shipped! You'll receive tracking information separately.",
              delivered:
                "Your order has been delivered. Thank you for shopping with MyLegacy Cannabis! We hope you enjoy your purchase.",
              cancelled:
                "Your order has been cancelled. If you didn't request this, please contact us immediately at support@mylegacycannabis.ca.",
              refunded:
                "Your order has been refunded. The refund will be processed within 3-5 business days.",
            };
            const statusMsg =
              statusMessages[input.status] ||
              `Your order status has been updated to: ${input.status}.`;

            triggerOrderStatusUpdate({
              customerName: statusOrder.guestName || "Customer",
              customerEmail: statusOrder.guestEmail,
              orderId: statusOrder.orderNumber || String(input.id),
              orderStatus:
                input.status.charAt(0).toUpperCase() + input.status.slice(1),
              statusMessage: statusMsg,
            }).catch(err =>
              console.warn("[Status] Email failed:", err.message)
            );
          }

          return { success: true };
        }),
      updatePayment: adminProcedure
        .input(
          z.object({
            id: z.number(),
            paymentStatus: z.enum([
              "pending",
              "received",
              "confirmed",
              "partially_refunded",
              "refunded",
            ]),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await db.updateOrder(input.id, {
            paymentStatus: input.paymentStatus,
          });
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update_payment",
            entityType: "order",
            entityId: input.id,
            details: `Changed order #${input.id} payment to ${input.paymentStatus}`,
          });

          // Send payment received emails when payment is received or confirmed
          if (
            input.paymentStatus === "received" ||
            input.paymentStatus === "confirmed"
          ) {
            const order = await db.getOrderById(input.id);
            if (order && order.guestEmail) {
              triggerPaymentReceived({
                customerName: order.guestName || "Customer",
                customerEmail: order.guestEmail,
                orderId: order.orderNumber || String(input.id),
                orderTotal: order.total || "0",
                isGuest: true,
              }).catch(err =>
                console.warn("[Payment] Email failed:", err.message)
              );

              // Push notification for payment received
              if (order.userId) {
                notifyPaymentReceived(
                  order.userId,
                  order.orderNumber || String(input.id),
                  parseFloat(order.total) || 0
                ).catch(err =>
                  console.warn(
                    "[Push] Payment notification failed:",
                    (err as Error).message
                  )
                );
              }
            }
          }

          return { success: true };
        }),
      addTracking: adminProcedure
        .input(
          z.object({
            id: z.number(),
            trackingNumber: z
              .string()
              .transform(v => v.replace(/[\s-]/g, "").toUpperCase())
              .refine(
                v =>
                  /^\d{16}$/.test(v) || // 16-digit domestic PIN
                  /^\d{12}$/.test(v) || // 12-digit domestic PIN
                  /^[A-Z]{2}\d{9}CA$/.test(v) || // 13-char S10 international (e.g. EE123456789CA)
                  /^[A-Z]{2}\d{7}CA$/.test(v), // 11-char domestic (e.g. AB1234567CA)
                {
                  message:
                    "Invalid Canada Post tracking number. Expected: 16 digits, 12 digits, or 2 letters + digits + CA (11 or 13 chars).",
                }
              ),
            trackingUrl: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const order = await db.getOrderById(input.id);
          if (!order) throw new Error("Order not found");

          // ─── TRACKING GATE: payment must be confirmed (or partially_refunded) ───
          if (
            order.paymentStatus !== "confirmed" &&
            order.paymentStatus !== "partially_refunded"
          ) {
            throw new Error(
              `Cannot add tracking — payment must be confirmed first (current: ${order.paymentStatus}).`
            );
          }

          // ─── TRACKING DEPENDENCY: order must be in confirmed or processing state ───
          if (!["confirmed", "processing"].includes(order.status)) {
            throw new Error(
              `Cannot add tracking — order must be in "confirmed" or "processing" state (current: ${order.status}).`
            );
          }

          const trackingUrl =
            input.trackingUrl ||
            `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${input.trackingNumber}`;

          // ─── AUTO-CASCADE: Enter tracking → set order to shipped + award points ───
          await db.updateOrder(input.id, {
            trackingNumber: input.trackingNumber,
            trackingUrl,
            status: "shipped",
          } as any);

          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "add_tracking",
            entityType: "order",
            entityId: input.id,
            details: `Added tracking: ${input.trackingNumber} → auto-set to shipped`,
          });
          console.log(
            `[Cascade] Order #${input.id} tracking added → auto-set to shipped`
          );

          // Award reward points on shipment (previously only on delivered)
          const pointsResult = await db.awardOrderPoints(input.id);
          if (pointsResult) {
            console.log(
              `[Rewards] Awarded ${pointsResult.points} points for shipped order #${input.id}`
            );
          }

          // Send "Order Shipped" email to customer with tracking info
          const trackOrder = await db.getOrderById(input.id);
          if (trackOrder && trackOrder.guestEmail) {
            triggerOrderShipped({
              customerName: trackOrder.guestName || "Customer",
              customerEmail: trackOrder.guestEmail,
              orderId: trackOrder.orderNumber || String(input.id),
              trackingNumber: input.trackingNumber,
              trackingUrl,
            }).catch(err =>
              console.warn("[Tracking] Email failed:", err.message)
            );
          }

          return { success: true };
        }),
      addNote: adminProcedure
        .input(z.object({ id: z.number(), note: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const order = await db.getOrderById(input.id);
          const existingNotes = order?.adminNotes || "";
          const timestamp = new Date().toISOString();
          const newNote = `[${timestamp}] ${ctx.user?.name || "Admin"}: ${input.note}`;
          await db.updateOrder(input.id, {
            adminNotes: existingNotes
              ? `${existingNotes}\n${newNote}`
              : newNote,
          });
          return { success: true };
        }),
    }),

    // ─── TRACKING: poll for delivery updates ───
    trackingPoll: adminProcedure.mutation(async () => {
      if (!isTrackingServiceConfigured()) {
        throw new Error(
          "Gmail API is not configured. Tracking service requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN."
        );
      }
      const stats = await pollTrackingEmails();
      return stats;
    }),

    // ─── ID VERIFICATIONS ───
    verifications: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
            status: z.string().optional(),
          })
        )
        .query(async ({ input }) => {
          return db.getAllVerifications(input);
        }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getVerificationById(input.id);
        }),
      review: adminProcedure
        .input(
          z.object({
            id: z.number(),
            status: z.enum(["approved", "rejected"]),
            notes: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
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
              const linkedUser = await db.getUserByEmail(
                verification.guestEmail
              );
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
                  const cleanedNotes =
                    order.notes
                      .split("\n")
                      .filter(
                        (line: string) =>
                          !line.includes("[ID VERIFICATION PENDING]")
                      )
                      .join("\n")
                      .trim() || null;
                  await db.updateOrder(order.id, {
                    notes: cleanedNotes,
                  } as any);
                }
              }
            }
          }
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: input.status,
            entityType: "verification",
            entityId: input.id,
            details: `${input.status} verification #${input.id}${input.notes ? `: ${input.notes}` : ""}`,
          });
          // Only send ID verification notification emails when the feature is enabled
          const idVerifEnabledReview = await db.isIdVerificationEnabled();
          if (idVerifEnabledReview) {
            await notifyOwner({
              title: `ID Verification ${input.status}`,
              content: `Verification #${input.id} has been ${input.status}`,
            });
          }

          // Send templated customer emails for ID review results
          if (verification && verification.guestEmail) {
            const customerName = verification.guestName || "Customer";
            const customerEmail = verification.guestEmail;
            const isGuest = !verification.userId;

            if (input.status === "approved") {
              triggerIdApproved({ customerName, customerEmail, isGuest }).catch(
                err =>
                  console.warn(
                    "[Verification] Approved email failed:",
                    err.message
                  )
              );
            } else if (input.status === "rejected") {
              triggerIdRejected({
                customerName,
                customerEmail,
                rejectionReason:
                  input.notes || "The submitted ID could not be verified.",
                isGuest,
              }).catch(err =>
                console.warn(
                  "[Verification] Rejected email failed:",
                  err.message
                )
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
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            rate: z.string().optional(),
            deliveryDays: z.string().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateShippingZone(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "shipping_zone",
            entityId: id,
            details: `Updated shipping zone #${id}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),
      create: adminProcedure
        .input(
          z.object({
            zoneName: z.string(),
            provinces: z.array(z.string()),
            rate: z.string(),
            deliveryDays: z.string(),
            isActive: z.boolean().default(true),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const id = await db.createShippingZone(input as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create",
            entityType: "shipping_zone",
            entityId: id,
            details: `Created shipping zone: ${input.zoneName}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { id };
        }),
    }),

    // ─── EMAIL TEMPLATES ───
    emailTemplates: router({
      list: adminProcedure.query(async () => {
        return db.getAllEmailTemplates();
      }),
      get: adminProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
          return db.getEmailTemplateBySlug(input.slug);
        }),
      // Returns resolved variable values for admin email preview
      resolvedVars: adminProcedure.query(async () => {
        return getResolvedCommonVars();
      }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            subject: z.string().optional(),
            bodyHtml: z.string().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateEmailTemplate(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "email_template",
            entityId: id,
            details: `Updated email template #${id}`,
          });
          // Sync knowledge so AI stays up-to-date with template changes
          db.syncAllSiteKnowledge().catch(() => {});
          return { success: true };
        }),
      create: adminProcedure
        .input(
          z.object({
            slug: z.string(),
            name: z.string(),
            subject: z.string(),
            bodyHtml: z.string(),
            variables: z.array(z.string()).optional(),
            isActive: z.boolean().default(true),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const id = await db.createEmailTemplate(input as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create",
            entityType: "email_template",
            entityId: id,
            details: `Created email template: ${input.name}`,
          });
          // Sync knowledge so AI stays up-to-date with template changes
          db.syncAllSiteKnowledge().catch(() => {});
          return { id };
        }),

      // ─── AI: GENERATE EMAIL TEMPLATE ───
      aiGenerate: adminProcedure
        .input(
          z.object({
            prompt: z.string().min(5).max(2000),
            variables: z.array(z.string()).optional(),
            tone: z
              .enum([
                "professional",
                "friendly",
                "urgent",
                "celebratory",
                "minimal",
              ])
              .default("professional"),
            audience: z.enum(["customer", "admin"]).default("customer"),
          })
        )
        .mutation(async ({ input }) => {
          const siteBase = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : process.env.SITE_URL ||
              "https://mylegacycannabisca-production.up.railway.app";
          const logoUrl =
            (await db.getSiteSetting("email_logo_url")) ||
            `${siteBase}/logo.png`;

          // ── Fetch LIVE site knowledge for AI context ──
          let liveProductsContext = "";
          let liveLocationsContext = "";
          let liveCategoryContext = "";
          try {
            const productLinksRaw = await db.getSiteKnowledge("product_links");
            if (productLinksRaw) {
              const links = JSON.parse(productLinksRaw);
              // Include top 30 products as context (keep prompt concise)
              const topProducts = links
                .slice(0, 30)
                .map(
                  (p: any) =>
                    `${p.name} (${p.category}) — $${p.price} — ${siteBase}/product/${p.url.replace("/product/", "")}`
                );
              liveProductsContext = `\n\nLIVE PRODUCT CATALOG (${links.length} total, showing top 30):\n${topProducts.join("\n")}`;
            }
          } catch {
            /* products not synced yet */
          }

          try {
            const locationsRaw = await db.getSiteKnowledge("store_locations");
            if (locationsRaw) {
              const locs = JSON.parse(locationsRaw);
              liveLocationsContext = `\n\nSTORE LOCATIONS WITH MAP LINKS:\n${locs
                .map(
                  (l: any) =>
                    `- ${l.name}: ${l.address}, ${l.city}, ${l.province} ${l.postalCode} | Phone: ${l.phone} | Hours: ${l.hours}\n  Google Maps: ${l.directionsUrl || "N/A"}`
                )
                .join("\n")}`;
            }
          } catch {
            /* locations not synced yet */
          }

          try {
            const catCountsRaw = await db.getSiteKnowledge("category_counts");
            if (catCountsRaw) {
              const counts = JSON.parse(catCountsRaw);
              liveCategoryContext = `\n\nCATEGORY PRODUCT COUNTS: ${JSON.stringify(counts)}`;
            }
          } catch {
            /* category counts not synced yet */
          }

          const systemPrompt = `You are an email template designer for My Legacy Cannabis.

${getMlcBusinessContext()}
- Website: https://mylegacycannabis.ca
${liveProductsContext}${liveLocationsContext}${liveCategoryContext}

${MLC_BRAND_DNA}

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
- Primary brand purple: #4B2DBE, Secondary purple: #3A2270, Accent orange: #F19929
- Accent colors: success #4CAF50, warning #FF9800, danger #F44336, info #2196F3
- Always start body with a colored heading row: <tr><td style="background:linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%); padding:20px 30px; text-align:center;"><h1 style="color:#FFFFFF; margin:0; font-size:24px; font-weight:bold;">HEADING</h1></td></tr>
- Then a body row: <tr><td style="padding:40px 30px;">...content...</td></tr>
- Use {{variable_name}} placeholders for dynamic content
- CTA buttons: <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:15px 40px; border-radius:50px; font-size:16px; font-weight:bold;">Button Text</a>
- Info boxes: <div style="background-color:#E3F2FD; border-left:4px solid #2196F3; padding:20px; margin:20px 0; border-radius:4px;">...</div>
- Warning boxes: <div style="background-color:#FFF59D; border-left:4px solid #FFD700; padding:20px; margin:20px 0; border-radius:4px;">...</div>
- Always end with: Questions? Contact us at support@mylegacycannabis.ca
- Do NOT use emoji characters in the HTML

LINK RULES — CRITICAL:
- When the admin mentions a specific PRODUCT, use the real product URL from the LIVE PRODUCT CATALOG above (e.g., https://mylegacycannabis.ca/product/hydro-kush). If the product is not in the catalog, construct the URL as https://mylegacycannabis.ca/product/{{product_slug}} and add product_slug to the variables list.
- When the admin mentions a specific LOCATION (e.g., "Hamilton"), use the real Google Maps directions URL from STORE LOCATIONS above. Hardcode it directly in the HTML — do NOT use a placeholder for known location links.
- For links that should be resolved at send-time, use {{variable_name}} placeholders.
- {{shop_url}} resolves to https://mylegacycannabis.ca/shop
- {{action_url}} resolves to a CTA destination (shop or account or custom)
- {{account_url}} resolves to https://mylegacycannabis.ca/account
- {{logo_url}} resolves to the brand logo image URL
- {{site_url}} resolves to https://mylegacycannabis.ca
- {{locations_url}} resolves to https://mylegacycannabis.ca/locations
- {{faq_url}} resolves to https://mylegacycannabis.ca/faq
- {{unsubscribe_url}}, {{privacy_url}}, {{terms_url}} — footer links (auto-injected)
- NEVER use placeholder URLs like "https://maps.app.goo.gl/YourHamiltonMapLink" — always use the REAL URL from the data above or a resolvable {{variable}}.

AVAILABLE TEMPLATE VARIABLES (the engine auto-injects logo_url, unsubscribe_url, privacy_url, terms_url, shop_url, action_url, account_url, site_url, locations_url, faq_url, payment_email):
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
- {{shop_url}} — link to the shop (auto-resolved to real URL)
- {{account_url}} — link to user account (auto-resolved)
- {{action_url}} — generic CTA link (auto-resolved)
- {{site_url}} — main website link (auto-resolved)
- {{locations_url}} — link to locations page (auto-resolved)
- {{faq_url}} — link to FAQ page (auto-resolved)
- {{logo_url}} — brand logo image URL (auto-injected)
- {{payment_email}} — payment email address (auto-injected)
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

          const content =
            typeof result.choices[0]?.message?.content === "string"
              ? result.choices[0].message.content
              : "";

          if (!content) {
            throw new Error("AI returned an empty response — please try again");
          }

          // Parse JSON — strip markdown fences if present
          const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          let parsed: any;
          try {
            parsed = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error(
              "[AI Generate] Failed to parse AI response:",
              cleaned.slice(0, 500)
            );
            throw new Error(
              "AI returned invalid JSON — please try again with a simpler prompt"
            );
          }

          // Validate required fields
          if (
            !parsed.slug ||
            !parsed.name ||
            !parsed.subject ||
            !parsed.bodyHtml
          ) {
            throw new Error(
              "AI returned incomplete template — missing slug, name, subject, or bodyHtml"
            );
          }

          return {
            slug: String(parsed.slug),
            name: String(parsed.name),
            subject: String(parsed.subject),
            bodyHtml: String(parsed.bodyHtml),
            variables: Array.isArray(parsed.variables)
              ? parsed.variables.map(String)
              : [],
          };
        }),

      // ─── AI: IMPROVE EXISTING TEMPLATE ───
      aiImprove: adminProcedure
        .input(
          z.object({
            currentSubject: z.string(),
            currentBodyHtml: z.string(),
            currentVariables: z.array(z.string()),
            instruction: z.string().min(5).max(2000),
          })
        )
        .mutation(async ({ input }) => {
          // ── Fetch LIVE site knowledge for AI context ──
          const siteBase = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : process.env.SITE_URL ||
              "https://mylegacycannabisca-production.up.railway.app";
          let liveLocationsContext = "";
          let liveProductsContext = "";
          try {
            const locationsRaw = await db.getSiteKnowledge("store_locations");
            if (locationsRaw) {
              const locs = JSON.parse(locationsRaw);
              liveLocationsContext = `\n\nSTORE LOCATIONS WITH MAP LINKS:\n${locs
                .map(
                  (l: any) =>
                    `- ${l.name}: ${l.address}, ${l.city}, ${l.province} ${l.postalCode} | Phone: ${l.phone}\n  Google Maps: ${l.directionsUrl || "N/A"}`
                )
                .join("\n")}`;
            }
          } catch {
            /* skip */
          }
          try {
            const productLinksRaw = await db.getSiteKnowledge("product_links");
            if (productLinksRaw) {
              const links = JSON.parse(productLinksRaw);
              const topProducts = links
                .slice(0, 20)
                .map(
                  (p: any) =>
                    `${p.name} (${p.category}) — $${p.price} — ${siteBase}/product/${p.url.replace("/product/", "")}`
                );
              liveProductsContext = `\n\nLIVE PRODUCTS (${links.length} total, top 20):\n${topProducts.join("\n")}`;
            }
          } catch {
            /* skip */
          }

          const systemPrompt = `You are an email template designer for My Legacy Cannabis.

${getMlcBusinessContext()}${liveLocationsContext}${liveProductsContext}

${MLC_BRAND_DNA}

You will be given an EXISTING email template and an instruction to improve it. Return the improved version.

RULES:
- Keep the exact same HTML shell structure (<!DOCTYPE html> wrapper, header with logo, accent stripe, footer)
- Only modify the CONTENT between header and footer unless specifically asked to change structure
- Preserve all existing {{variable}} placeholders unless told to remove them
- Use inline CSS only — no <style> blocks
- Brand purple: #4B2DBE (primary), #3A2270 (secondary), Orange: #F19929
- Do NOT use emoji characters
- Keep the same slug/name unless the admin asks for a rename
- When referencing a specific product, use the REAL product URL from LIVE PRODUCTS above (e.g., https://mylegacycannabis.ca/product/hydro-kush)
- When referencing a specific location, use the REAL Google Maps directions URL from STORE LOCATIONS above
- NEVER use placeholder URLs like "https://maps.app.goo.gl/YourHamiltonMapLink" — always use REAL URLs
- {{shop_url}} resolves to https://mylegacycannabis.ca/shop, {{action_url}} is a CTA link, {{site_url}} is the main site
- Auto-injected variables: logo_url, unsubscribe_url, privacy_url, terms_url, shop_url, action_url, account_url, site_url, locations_url, faq_url, payment_email

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

          const content =
            typeof result.choices[0]?.message?.content === "string"
              ? result.choices[0].message.content
              : "";

          if (!content) {
            throw new Error("AI returned an empty response — please try again");
          }

          const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          let parsed: any;
          try {
            parsed = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error(
              "[AI Improve] Failed to parse AI response:",
              cleaned.slice(0, 500)
            );
            throw new Error(
              "AI returned invalid JSON — please try again with different instructions"
            );
          }

          if (!parsed.subject || !parsed.bodyHtml) {
            throw new Error(
              "AI returned incomplete result — missing subject or bodyHtml"
            );
          }

          return {
            subject: String(parsed.subject),
            bodyHtml: String(parsed.bodyHtml),
            variables: Array.isArray(parsed.variables)
              ? parsed.variables.map(String)
              : input.currentVariables,
          };
        }),

      /** Apply the visual design/style of one template to another, keeping the target's content */
      aiApplyDesign: adminProcedure
        .input(
          z.object({
            sourceBodyHtml: z.string().min(10),
            targetSlug: z.string(),
            targetSubject: z.string(),
            targetBodyHtml: z.string(),
            targetVariables: z.array(z.string()),
          })
        )
        .mutation(async ({ input }) => {
          const siteBase = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : process.env.SITE_URL ||
              "https://mylegacycannabisca-production.up.railway.app";
          const logoUrl =
            (await db.getSiteSetting("email_logo_url")) ||
            `${siteBase}/logo.png`;

          const systemPrompt = `You are an email template designer for My Legacy Cannabis.

${getMlcBusinessContext()}

${MLC_BRAND_DNA}

TASK: You are given a SOURCE email template (the "design reference") and a TARGET email template.
Your job is to APPLY the visual design, layout patterns, color scheme, and styling of the SOURCE to the TARGET.
Keep the TARGET's actual content, text, subject, and {{variables}} — only change the visual presentation.

RULES:
- Extract the SOURCE's design DNA: color gradients, spacing, button styles, font sizing, box styles, accent patterns, etc.
- Apply that design to the TARGET's content — same info boxes, CTA buttons, heading styles, etc.
- Preserve ALL {{variable}} placeholders from the target
- Use inline CSS only — no <style> blocks
- Keep the same header/footer shell (logo + accent stripe + footer)
- The logo URL is: ${logoUrl}
- Do NOT use emoji characters

RESPONSE FORMAT — return valid JSON only:
{
  "subject": "Same or slightly refined subject",
  "bodyHtml": "COMPLETE HTML document with new design applied",
  "variables": ["array","of","variable","names","used"]
}`;

          const userMessage = `SOURCE TEMPLATE (design reference — copy its visual style):
${input.sourceBodyHtml}

TARGET TEMPLATE (apply the source's design to this content):
Subject: ${input.targetSubject}
HTML: ${input.targetBodyHtml}
Variables: ${input.targetVariables.join(", ")}

Return ONLY the JSON object.`;

          const result = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            responseFormat: { type: "json_object" },
            maxTokens: 16384,
          });

          const content =
            typeof result.choices[0]?.message?.content === "string"
              ? result.choices[0].message.content
              : "";
          if (!content) throw new Error("AI returned empty response");

          const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          let parsed: any;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            throw new Error("AI returned invalid JSON");
          }
          if (!parsed.bodyHtml)
            throw new Error("AI returned incomplete result");

          return {
            subject: String(parsed.subject || input.targetSubject),
            bodyHtml: String(parsed.bodyHtml),
            variables: Array.isArray(parsed.variables)
              ? parsed.variables.map(String)
              : input.targetVariables,
          };
        }),
    }),

    // ─── SITE SETTINGS ───
    settings: router({
      getAll: adminProcedure.query(async () => {
        return db.getAllSiteSettings();
      }),
      update: adminProcedure
        .input(
          z.object({
            key: z.string(),
            value: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await db.setSiteSetting(input.key, input.value);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "site_setting",
            entityId: 0,
            details: `Updated setting "${input.key}" to "${input.value}"`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
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
      events: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(25),
            status: z.enum(["sent", "failed", "bounced"]).optional(),
          })
        )
        .query(({ input }) => {
          return getEmailEvents(input);
        }),

      /** Ping a specific provider (resend, smtp, sendgrid, mailgun, ses) */
      ping: adminProcedure
        .input(
          z.object({
            provider: z.string(),
          })
        )
        .mutation(async ({ input }) => {
          return pingProvider(input.provider);
        }),

      /** Send a real test email to verify end-to-end delivery */
      sendTest: adminProcedure
        .input(
          z.object({
            to: z.string().email(),
          })
        )
        .mutation(async ({ input }) => {
          return sendTestEmail(input.to);
        }),

      /** List all known providers and their configuration status */
      providers: adminProcedure.query(() => {
        return getAvailableProviders();
      }),
    }),

    // ─── USERS ───
    users: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(20),
            search: z.string().optional(),
          })
        )
        .query(async ({ input }) => {
          return db.getAllUsers(input.page, input.limit, input.search);
        }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getUserById(input.id);
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            birthday: z.string().optional(),
            role: z.enum(["user", "admin"]).optional(),
            adminNotes: z.string().optional(),
            idVerified: z.boolean().optional(),
            rewardPoints: z.number().int().min(0).optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateUser(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "user",
            entityId: id,
            details: `Updated customer #${id}`,
          });
          return { success: true };
        }),
      lock: adminProcedure
        .input(
          z.object({
            id: z.number(),
            locked: z.boolean(),
            reason: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const user = await db.getUserById(input.id);
          if (!user) throw new Error("User not found");
          const existingNotes = (user as any).adminNotes || "";
          const lockNote = input.locked
            ? `[LOCKED ${new Date().toLocaleString("en-CA")}]${input.reason ? ": " + input.reason : ""}`
            : `[UNLOCKED ${new Date().toLocaleString("en-CA")}]`;
          const newNotes = existingNotes
            ? `${existingNotes}\n${lockNote}`
            : lockNote;
          await db.updateUser(input.id, {
            isLocked: input.locked,
            adminNotes: newNotes,
          } as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: input.locked ? "lock" : "unlock",
            entityType: "user",
            entityId: input.id,
            details: `${input.locked ? "Locked" : "Unlocked"} customer #${input.id}${input.reason ? ": " + input.reason : ""}`,
          });
          return { success: true };
        }),
      resetPassword: adminProcedure
        .input(
          z.object({
            id: z.number(),
            newPassword: z
              .string()
              .min(8, "Password must be at least 8 characters"),
          })
        )
        .mutation(async ({ input, ctx }) => {
          // Store hashed-equivalent — for OTP-based auth, we store a forced OTP reset note
          // In production this would hash & store a password. For now we log the action and
          // invalidate all sessions by updating the user record timestamp.
          const user = await db.getUserById(input.id);
          if (!user) throw new Error("User not found");
          const existingNotes = (user as any).adminNotes || "";
          const resetNote = `[PASSWORD RESET by admin ${new Date().toLocaleString("en-CA")}]`;
          await db.updateUser(input.id, {
            adminNotes: existingNotes
              ? `${existingNotes}\n${resetNote}`
              : resetNote,
            lastSignedIn: new Date(), // bumps updatedAt to invalidate any cached sessions
          } as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "reset_password",
            entityType: "user",
            entityId: input.id,
            details: `Reset password for customer #${input.id}`,
          });
          return { success: true };
        }),
      delete: adminProcedure
        .input(
          z.object({
            id: z.number(),
            confirm: z.literal(true),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const user = await db.getUserById(input.id);
          if (!user) throw new Error("User not found");
          await db.deleteUser(input.id);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "delete",
            entityType: "user",
            entityId: input.id,
            details: `Deleted customer #${input.id} (${user.email || user.phone || "unknown"})`,
          });
          return { success: true };
        }),
      adjustPoints: adminProcedure
        .input(
          z.object({
            id: z.number(),
            delta: z.number().int(),
            reason: z.string().min(1, "Reason is required"),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const user = await db.getUserById(input.id);
          if (!user) throw new Error("User not found");
          const newPoints = Math.max(0, (user.rewardPoints || 0) + input.delta);
          await db.updateUser(input.id, { rewardPoints: newPoints } as any);
          await db.addRewardsHistory({
            userId: input.id,
            points: input.delta,
            type: input.delta >= 0 ? "admin_add" : "admin_deduct",
            description: `Admin adjustment: ${input.reason}`,
          } as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "adjust_points",
            entityType: "user",
            entityId: input.id,
            details: `Adjusted points for #${input.id} by ${input.delta > 0 ? "+" : ""}${input.delta}: ${input.reason}`,
          });
          return { success: true, newPoints };
        }),
      orders: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getUserOrders(input.id);
        }),
      /** Admin: create a new user (customer or admin) */
      create: adminProcedure
        .input(
          z.object({
            firstName: z.string().min(2),
            lastName: z.string().min(2),
            email: z.string().email(),
            phone: z.string().min(10),
            role: z.enum(["user", "admin"]),
            birthday: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          // Check for duplicate email
          const existingEmail = await db.getUserByEmail(
            input.email.toLowerCase().trim()
          );
          if (existingEmail)
            throw new Error("A user with this email already exists.");
          // Check for duplicate phone — normalize to final stored form BEFORE lookup
          let normalizedPhone = input.phone.replace(/\D/g, "");
          // Strip leading country code "1" for Canadian numbers to get the 10-digit form
          if (
            normalizedPhone.length === 11 &&
            normalizedPhone.startsWith("1")
          ) {
            normalizedPhone = normalizedPhone.substring(1);
          }
          // Check BOTH forms to catch any existing records stored with or without leading "1"
          const existingPhone = await db.getUserByPhone(normalizedPhone);
          const existingPhone11 = !existingPhone
            ? await db.getUserByPhone("1" + normalizedPhone)
            : null;
          if (existingPhone || existingPhone11)
            throw new Error("A user with this phone number already exists.");

          const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;
          const id = await db.adminCreateUser({
            name: fullName,
            email: input.email.toLowerCase().trim(),
            phone: normalizedPhone,
            role: input.role,
            birthday: input.birthday,
          });

          // Welcome bonus history
          try {
            await db.addRewardsHistory({
              userId: id,
              points: 25,
              type: "earned" as any,
              description: "Welcome bonus — account created by admin",
            } as any);
          } catch (_) {}

          // Send welcome email
          if (input.email) {
            triggerWelcomeEmail({
              customerName: fullName,
              customerEmail: input.email.toLowerCase().trim(),
            }).catch(err =>
              console.warn("[Admin] Welcome email failed:", err.message)
            );
          }

          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create",
            entityType: "user",
            entityId: id,
            details: `Created ${input.role}: ${fullName} (${input.email})`,
          });
          await db
            .logSystem({
              level: "info",
              source: "admin",
              action: "create_user",
              message: `Admin created ${input.role}: ${fullName} <${input.email}>`,
            })
            .catch(() => {});

          return { success: true, id };
        }),
    }),

    // ─── SYSTEM LOGS ───
    systemLogs: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
            level: z.string().optional(),
            source: z.string().optional(),
            search: z.string().optional(),
          })
        )
        .query(async ({ input }) => {
          return db.getSystemLogs(input);
        }),
    }),

    // ─── FILE UPLOAD ───
    // Uploads any file. For image types (png/jpg/webp/etc.), sharp auto-generates
    // optimised WebP versions at three responsive sizes (thumb 200px, card 400px, full 1200px).
    // Returns { url, key, optimized? } — optimized contains thumb/card/full/original URLs.
    upload: adminProcedure
      .input(
        z.object({
          fileName: z.string(),
          base64: z.string(),
          contentType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const ext = input.fileName.split(".").pop() || "bin";
        const key = `uploads/${nanoid()}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url, optimized } = await storagePut(
          key,
          buffer,
          input.contentType
        );
        return { url, key, optimized };
      }),

    // ─── COUPONS ───
    coupons: router({
      list: adminProcedure.query(async () => {
        return db.getAllCoupons();
      }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getCouponById(input.id);
        }),
      create: adminProcedure
        .input(
          z.object({
            code: z
              .string()
              .min(1)
              .transform(v => v.toUpperCase().replace(/\s/g, "")),
            name: z.string().min(1),
            type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
            value: z.string(),
            minOrderAmount: z.string().optional(),
            maxDiscount: z.string().optional(),
            usageLimit: z.number().optional(),
            perUserLimit: z.number().default(1),
            isActive: z.boolean().default(true),
            startsAt: z.date().optional(),
            expiresAt: z.date().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const id = await db.createCoupon(input as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create",
            entityType: "coupon",
            entityId: id,
            details: `Created coupon: ${input.code}`,
          });
          return { id };
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            code: z.string().optional(),
            name: z.string().optional(),
            type: z
              .enum(["percentage", "fixed_amount", "free_shipping"])
              .optional(),
            value: z.string().optional(),
            minOrderAmount: z.string().optional(),
            maxDiscount: z.string().optional(),
            usageLimit: z.number().optional(),
            perUserLimit: z.number().optional(),
            isActive: z.boolean().optional(),
            startsAt: z.date().optional(),
            expiresAt: z.date().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateCoupon(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "coupon",
            entityId: id,
            details: `Updated coupon #${id}`,
          });
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteCoupon(input.id);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "delete",
            entityType: "coupon",
            entityId: input.id,
            details: `Deleted coupon #${input.id}`,
          });
          return { success: true };
        }),
    }),

    // ─── REVIEWS ───
    reviews: router({
      list: adminProcedure
        .input(
          z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
          })
        )
        .query(async ({ input }) => {
          return db.getAllReviews(input);
        }),
      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return db.getReviewById(input.id);
        }),
      approve: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.approveReview(input.id);
          // Award review bonus points (10 pts) if not already awarded
          const REVIEW_BONUS = 10;
          const review = await db.getReviewById(input.id);
          if (review && !review.pointsAwarded) {
            const user = await db.getUserById(review.userId);
            if (user) {
              await db.updateUser(user.id, {
                rewardPoints: (user.rewardPoints || 0) + REVIEW_BONUS,
              } as any);
              await db.addRewardsHistory({
                userId: user.id,
                points: REVIEW_BONUS,
                type: "review" as any,
                description:
                  "Review bonus: +10 points for approved product review",
              } as any);
              await db.updateReviewPointsAwarded(input.id);
            }
          }
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "approve",
            entityType: "review",
            entityId: input.id,
            details: `Approved review #${input.id}`,
          });
          return { success: true };
        }),
      unapprove: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.updateProductReview(input.id, { isApproved: false } as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "unapprove",
            entityType: "review",
            entityId: input.id,
            details: `Unapproved review #${input.id}`,
          });
          return { success: true };
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            rating: z.number().min(1).max(5).optional(),
            title: z.string().max(255).optional(),
            body: z.string().max(2000).optional(),
            tags: z.array(z.string()).optional(),
            strengthRating: z.number().min(1).max(5).optional(),
            smoothnessRating: z.number().min(1).max(5).optional(),
            effectTags: z.array(z.string()).optional(),
            experienceLevel: z
              .enum(["beginner", "intermediate", "experienced"])
              .optional(),
            usageTiming: z.enum(["daytime", "nighttime", "anytime"]).optional(),
            wouldRecommend: z.boolean().optional(),
            isApproved: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateProductReview(id, data as any);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update",
            entityType: "review",
            entityId: id,
            details: `Updated review #${id}`,
          });
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteProductReview(input.id);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "delete",
            entityType: "review",
            entityId: input.id,
            details: `Deleted review #${input.id}`,
          });
          return { success: true };
        }),
    }),

    // ─── MENU IMPORT (AI-powered product import from menu photos) ───
    menuImport: router({
      /** Parse a menu image using AI vision → return structured product list for review */
      parse: adminProcedure
        .input(
          z.object({
            imageBase64: z.string().min(100, "Image data is too small"),
            mimeType: z.string().default("image/png"),
          })
        )
        .mutation(async ({ input, ctx }) => {
          try {
            const items = await parseMenuImage(
              input.imageBase64,
              input.mimeType
            );
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
            return {
              success: false,
              items: [] as ParsedMenuItem[],
              count: 0,
              error: err.message,
            };
          }
        }),

      /** Apply confirmed import — create/update products, optionally deactivate old ones */
      confirm: adminProcedure
        .input(
          z.object({
            items: z.array(
              z.object({
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
              })
            ),
            deactivateOldFlower: z.boolean().default(false),
            defaultStock: z.number().min(0).default(10),
          })
        )
        .mutation(async ({ input, ctx }) => {
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

    // ─── SITE LOGO (global — used in header, footer, admin, emails, etc.) ───
    emailLogo: router({
      get: adminProcedure.query(async () => {
        const raw =
          (await db.getSiteSetting("site_logo_url")) ||
          (await db.getSiteSetting("email_logo_url")) ||
          "";
        // If the stored value is an oversized data URL (legacy), fall back to /logo.webp
        if (!raw || (raw.startsWith("data:") && raw.length > 50000)) {
          return { url: "/logo.webp" };
        }
        // Add a cache-bust param based on the file's mtime so the browser always
        // shows the latest logo after an upload, even if the filename is unchanged.
        const cleanUrl = raw.split("?")[0];
        let cacheBust = "";
        try {
          const fs = await import("fs");
          const pathMod = await import("path");
          const filePath = pathMod.resolve(
            process.cwd(),
            "dist",
            "public",
            cleanUrl.slice(1)
          );
          if (fs.existsSync(filePath)) {
            cacheBust = `?v=${Math.floor(fs.statSync(filePath).mtimeMs)}`;
          } else {
            cacheBust = `?v=${Date.now()}`;
          }
        } catch {
          cacheBust = `?v=${Date.now()}`;
        }
        return { url: cleanUrl + cacheBust };
      }),
      update: adminProcedure
        .input(
          z.object({
            url: z.string().url(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          // Update both keys for backward compatibility
          await db.setSiteSetting("site_logo_url", input.url);
          await db.setSiteSetting("email_logo_url", input.url);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update_site_logo",
            entityType: "site_setting",
            entityId: 0,
            details: `Updated site logo URL (global — website, admin, emails)`,
          });
          return { success: true, url: input.url };
        }),
      upload: adminProcedure
        .input(
          z.object({
            fileName: z.string(),
            base64: z.string(),
            contentType: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const ext = input.fileName.split(".").pop() || "png";
          const key = `branding/site-logo.${ext}`;
          const buffer = Buffer.from(input.base64, "base64");
          const { url } = await storagePut(key, buffer, input.contentType);

          // ── Delete any stale WebP sibling so siteConfig doesn't serve the old one ──
          // storagePut auto-generates a .webp for the *new* upload, but if a previous
          // .webp exists from a prior logo it would be found first by siteConfig.
          // The storagePut call already overwrites it, but also explicitly handle the
          // case where the extension changed (e.g. old was .jpg, new is .png).
          try {
            const fs = await import("fs");
            const pathMod = await import("path");
            const projectRoot = process.cwd();
            const webpName = "site-logo.webp";
            for (const dir of [
              pathMod.resolve(projectRoot, "dist", "public", "uploads"),
              pathMod.resolve(projectRoot, "client", "public", "uploads"),
            ]) {
              const webpFile = pathMod.join(dir, webpName);
              // Only delete if storagePut didn't just create a fresh one
              // (storagePut creates it in the same dirs, so it'll already be new)
            }
          } catch {
            /* ignore cleanup errors */
          }

          // Append a cache-bust query param so browsers fetch the new file
          // instead of serving the stale cached version of /uploads/site-logo.png
          const cacheBust = `?v=${Date.now()}`;
          const urlWithBust = url + cacheBust;
          // Store the clean URL (without cache-bust) in the DB for email templates
          // but return the cache-busted URL for immediate browser display
          await db.setSiteSetting("site_logo_url", url);
          await db.setSiteSetting("email_logo_url", url);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "upload_site_logo",
            entityType: "site_setting",
            entityId: 0,
            details: `Uploaded new site logo (${input.fileName})`,
          });
          return { success: true, url: urlWithBust };
        }),
      reset: adminProcedure.mutation(async ({ ctx }) => {
        // Clear custom logo — revert to the default /logo.webp (website) & /logo.png (emails)
        await db.setSiteSetting("site_logo_url", "");
        await db.setSiteSetting("email_logo_url", "");
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "reset_site_logo",
          entityType: "site_setting",
          entityId: 0,
          details: `Reset site logo to default /logo.webp`,
        });
        return { success: true, url: "/logo.webp" };
      }),
    }),

    // ─── AI CONFIGURATION ───
    aiConfig: router({
      get: adminProcedure.query(async () => {
        const [
          provider,
          apiKey,
          model,
          fallbackProvider,
          fallbackApiKey,
          fallbackModel,
        ] = await Promise.all([
          db.getSiteSetting("ai_provider"),
          db.getSiteSetting("ai_api_key"),
          db.getSiteSetting("ai_model"),
          db.getSiteSetting("ai_fallback_provider"),
          db.getSiteSetting("ai_fallback_api_key"),
          db.getSiteSetting("ai_fallback_model"),
        ]);
        return {
          provider: provider || "openai",
          apiKeySet: !!apiKey,
          apiKeyPreview: apiKey
            ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
            : null,
          model: model || "",
          fallbackProvider: fallbackProvider || "",
          fallbackApiKeySet: !!fallbackApiKey,
          fallbackApiKeyPreview: fallbackApiKey
            ? `${fallbackApiKey.slice(0, 8)}...${fallbackApiKey.slice(-4)}`
            : null,
          fallbackModel: fallbackModel || "",
        };
      }),
      update: adminProcedure
        .input(
          z.object({
            provider: z.enum(["openai", "gemini"]),
            apiKey: z.string().optional(),
            model: z.string().optional(),
            fallbackProvider: z.enum(["openai", "gemini", ""]).optional(),
            fallbackApiKey: z.string().optional(),
            fallbackModel: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await db.setSiteSetting("ai_provider", input.provider);
          if (input.apiKey !== undefined && input.apiKey !== "") {
            await db.setSiteSetting("ai_api_key", input.apiKey);
          }
          if (input.model !== undefined) {
            await db.setSiteSetting("ai_model", input.model);
          }
          // Fallback provider config
          if (input.fallbackProvider !== undefined) {
            await db.setSiteSetting(
              "ai_fallback_provider",
              input.fallbackProvider
            );
          }
          if (
            input.fallbackApiKey !== undefined &&
            input.fallbackApiKey !== ""
          ) {
            await db.setSiteSetting(
              "ai_fallback_api_key",
              input.fallbackApiKey
            );
          }
          if (input.fallbackModel !== undefined) {
            await db.setSiteSetting("ai_fallback_model", input.fallbackModel);
          }
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update_ai_config",
            entityType: "site_setting",
            entityId: 0,
            details: `Updated AI: primary=${input.provider}${input.model ? ` (${input.model})` : ""}${input.fallbackProvider ? `, fallback=${input.fallbackProvider}` : ""}`,
          });
          clearAiConfigCache();
          return { success: true };
        }),
      test: adminProcedure.mutation(async () => {
        // Import getAiConfig dynamically to avoid circular deps
        const { getAiConfig } = await import("./_core/llm");
        const config = await getAiConfig();

        if (!config.apiKey) {
          return {
            success: false,
            error: "No API key configured. Please set an API key first.",
          };
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
              return {
                success: false,
                error: `Gemini API error ${resp.status}: ${errText.slice(0, 200)}`,
              };
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
                Authorization: `Bearer ${config.apiKey}`,
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
              return {
                success: false,
                error: `OpenAI API error ${resp.status}: ${errText.slice(0, 200)}`,
              };
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

    // ─── ADMIN: LOCATIONS MANAGEMENT ───
    locations: router({
      list: adminProcedure.query(async () => {
        return db.getAllLocations();
      }),

      create: adminProcedure
        .input(
          z.object({
            name: z.string().min(1),
            address: z.string().min(1),
            city: z.string().min(1),
            province: z.string().min(1).max(10),
            postalCode: z.string().min(1).max(10),
            phone: z.string().min(1),
            hours: z.string().optional().default("Open 24/7"),
            mapUrl: z.string().optional(),
            directionsUrl: z.string().optional(),
            lat: z.string().optional(),
            lng: z.string().optional(),
            sortOrder: z.number().optional().default(0),
            isActive: z.boolean().optional().default(true),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const id = await db.createLocation(input);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "create_location",
            entityType: "location",
            entityId: id,
            details: `Created location: ${input.name}`,
          });
          return { id };
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            address: z.string().min(1).optional(),
            city: z.string().min(1).optional(),
            province: z.string().min(1).max(10).optional(),
            postalCode: z.string().min(1).max(10).optional(),
            phone: z.string().min(1).optional(),
            hours: z.string().optional(),
            mapUrl: z.string().optional(),
            directionsUrl: z.string().optional(),
            lat: z.string().optional(),
            lng: z.string().optional(),
            sortOrder: z.number().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          await db.updateLocation(id, data);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "update_location",
            entityType: "location",
            entityId: id,
            details: `Updated location: ${input.name || id}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteLocation(input.id);
          await db.logAdminActivity({
            adminId: ctx.user?.id || 0,
            adminName: ctx.user?.name || "Admin",
            action: "delete_location",
            entityType: "location",
            entityId: input.id,
            details: `Deleted location #${input.id}`,
          });
          db.syncAllSiteKnowledge().catch(() => {}); // async knowledge refresh
          return { success: true };
        }),
    }),

    // ─── ADMIN: AI MEMORY & KNOWLEDGE ───
    aiMemory: router({
      /** Get AI memory for a specific user */
      getUserMemory: adminProcedure
        .input(z.object({ userId: z.number() }))
        .query(async ({ input }) => {
          return db.getAiUserMemory(input.userId);
        }),
      /** Get behavior summary for a specific user */
      getUserBehavior: adminProcedure
        .input(z.object({ userId: z.number() }))
        .query(async ({ input }) => {
          return db.getUserBehaviorSummary(input.userId);
        }),
      /** Force refresh AI memory for a specific user */
      refreshUserMemory: adminProcedure
        .input(z.object({ userId: z.number() }))
        .mutation(async ({ input }) => {
          await db.refreshAiUserMemory(input.userId);
          return {
            success: true,
            userId: input.userId,
            refreshedAt: new Date().toISOString(),
          };
        }),
      /** Batch refresh all AI user memories */
      refreshAllMemories: adminProcedure.mutation(async () => {
        const result = await db.refreshAllAiUserMemories();
        return {
          success: true,
          ...result,
          refreshedAt: new Date().toISOString(),
        };
      }),
      /** Force refresh site knowledge sync */
      syncKnowledge: adminProcedure.mutation(async () => {
        await db.syncAllSiteKnowledge();
        return { success: true, syncedAt: new Date().toISOString() };
      }),
      /** Get all site knowledge entries */
      allKnowledge: adminProcedure.query(async () => {
        return db.getAllSiteKnowledge();
      }),
      /** Aggregate behavior analytics across all users */
      aggregateAnalytics: adminProcedure.query(async () => {
        return db.getAggregateBehaviorAnalytics();
      }),
      /** Get all AI user memories (enriched with user names) */
      allMemories: adminProcedure.query(async () => {
        return db.getAllAiUserMemories();
      }),
      /** Get live order stats for a specific user (real-time, not cached) */
      getUserOrderStats: adminProcedure
        .input(z.object({ userId: z.number() }))
        .query(async ({ input }) => {
          return db.getUserOrderStats(input.userId);
        }),
      /** Back-fill orders with null user_id by matching guest email to users */
      backfillOrders: adminProcedure.mutation(async () => {
        const linked = await db.backfillOrderUserIds();
        return { success: true, linked };
      }),
    }),

    // ═══════════════════════════════════════════════════════════════
    // GEO-ANALYTICS (IP-based location insights — PIPEDA-compliant)
    // ═══════════════════════════════════════════════════════════════
    geoAnalytics: router({
      /** Events, orders, revenue, visitors per province */
      byProvince: adminProcedure
        .input(
          z
            .object({
              days: z.number().default(30),
            })
            .optional()
        )
        .query(async ({ input }) => {
          return db.getGeoByProvince(input?.days ?? 30);
        }),

      /** Events, orders, revenue, visitors per city (optional province filter) */
      byCity: adminProcedure
        .input(
          z
            .object({
              days: z.number().default(30),
              province: z.string().optional(),
            })
            .optional()
        )
        .query(async ({ input }) => {
          return db.getGeoByCityRaw(input?.days ?? 30, input?.province);
        }),

      /** Product category breakdown by province */
      productsByRegion: adminProcedure
        .input(
          z
            .object({
              days: z.number().default(30),
            })
            .optional()
        )
        .query(async ({ input }) => {
          return db.getProductsByRegion(input?.days ?? 30);
        }),

      /** VPN/Proxy usage stats */
      proxyStats: adminProcedure
        .input(
          z
            .object({
              days: z.number().default(30),
            })
            .optional()
        )
        .query(async ({ input }) => {
          return db.getProxyStats(input?.days ?? 30);
        }),

      /** Daily trend (events, visitors, orders) for charting */
      dailyTrend: adminProcedure
        .input(
          z
            .object({
              days: z.number().default(30),
            })
            .optional()
        )
        .query(async ({ input }) => {
          return db.getGeoDailyTrend(input?.days ?? 30);
        }),

      /** Geo cache stats */
      cacheStats: adminProcedure.query(() => {
        return getGeoCacheStats();
      }),

      /** Sales by province (from orders table shipping_address) for Canada map */
      salesByProvince: adminProcedure
        .input(z.object({ days: z.number().default(30) }).optional())
        .query(async ({ input }) => {
          return db.getSalesByProvince(input?.days ?? 30);
        }),

      /** AI-powered map insight using configured LLM */
      aiMapInsight: adminProcedure
        .input(
          z.object({
            salesData: z.record(
              z.string(),
              z.object({
                revenue: z.number(),
                orders: z.number(),
                province: z.string(),
              })
            ),
          })
        )
        .mutation(async ({ input }) => {
          try {
            const { invokeLLM } = await import("./_core/llm");
            type ProvData = {
              revenue: number;
              orders: number;
              province: string;
            };
            const dataStr = Object.entries(
              input.salesData as Record<string, ProvData>
            )
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .map(
                ([code, d]) =>
                  `${d.province} (${code}): $${d.revenue.toFixed(2)} revenue, ${d.orders} orders`
              )
              .join("\n");

            const result = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "You are a cannabis e-commerce analytics expert for My Legacy Cannabis (Canada-based, serving GTA & Ottawa). " +
                    "Provide a concise 2-3 sentence insight about the provincial sales distribution. " +
                    "Focus on actionable recommendations: which provinces to target for growth, " +
                    "any surprising patterns, and opportunities. Keep it brief and business-focused.",
                },
                {
                  role: "user",
                  content: `Here is our sales data by province:\n${dataStr}\n\nProvide a brief actionable insight.`,
                },
              ],
              maxTokens: 300,
            });

            const text =
              typeof result.choices[0]?.message?.content === "string"
                ? result.choices[0].message.content
                : "";
            return { insight: text.trim() };
          } catch (err: any) {
            console.error(
              "[aiMapInsight] LLM error:",
              err.message?.slice(0, 200)
            );
            return {
              insight:
                "AI insight unavailable. Check your AI configuration in Admin > Settings.",
            };
          }
        }),
    }),
  }),
  store: router({
    // ─── PUBLIC: LOCATIONS LIST ───
    locations: publicProcedure.query(async () => {
      return db.getActiveLocations();
    }),

    // ─── UPDATE PROFILE (authenticated users) ───
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          birthday: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) throw new Error("Not authenticated");

        // ─── CUSTOMERS CANNOT EDIT THEIR OWN PROFILE ───
        // Only admins can update customer details via the admin panel.
        throw new Error(
          "Profile changes are locked. Please contact support@mylegacycannabis.ca to update your details."
        );
      }),

    // ─── SAVE SHIPPING ADDRESS (users can update their own saved address for checkout autofill) ───
    saveAddress: protectedProcedure
      .input(
        z.object({
          street: z.string().min(1),
          city: z.string().min(1),
          province: z.string().min(1),
          provinceCode: z.string().max(5).optional(),
          postalCode: z.string().min(1),
          country: z.string().max(2).default("CA"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) throw new Error("Not authenticated");
        await db.updateUserAddress(userId, {
          addressStreet: input.street,
          addressCity: input.city,
          addressProvince: input.province,
          addressProvinceCode: input.provinceCode || "",
          addressPostalCode: input.postalCode,
          addressCountry: input.country,
        });
        return { success: true };
      }),

    /** Remove the authenticated user's saved shipping address */
    clearAddress: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Not authenticated");
      await db.clearUserAddress(userId);
      return { success: true };
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
      const [
        idVerificationEnabled,
        idVerificationMode,
        maintenance,
        storeHoursConfig,
        paymentEmail,
        siteLogoUrl,
        emailLogoUrl,
        bannerMessagesRaw,
      ] = await Promise.all([
        db.isIdVerificationEnabled(),
        db.getIdVerificationMode(),
        db.getMaintenanceConfig(),
        db.getStoreHoursConfig(),
        db.getSiteSetting("payment_email"),
        db.getSiteSetting("site_logo_url"),
        db.getSiteSetting("email_logo_url"),
        db.getSiteSetting("banner_messages"),
      ]);
      // Determine the best logo URL:
      //  1. Skip oversized base64 data URLs (legacy storage bug)
      //  2. If the stored path is a PNG, check for an optimized .webp sibling on disk
      //  3. Fall back to the bundled /logo.webp (33 KB, 512×286)
      // Strip any query-string cache-bust params for filesystem checks (e.g. ?v=123)
      const rawLogoFull = siteLogoUrl || emailLogoUrl || "";
      const rawLogo = rawLogoFull.split("?")[0]; // clean path without ?v=...
      const rawLogoQuery = rawLogoFull.includes("?")
        ? rawLogoFull.slice(rawLogoFull.indexOf("?"))
        : "";
      let logoUrl = "/logo.webp"; // default fallback
      if (rawLogo && !(rawLogo.startsWith("data:") && rawLogo.length > 50000)) {
        // If it's a local PNG upload, prefer a .webp version if it exists on disk
        if (rawLogo.endsWith(".png") && rawLogo.startsWith("/uploads/")) {
          const fs = await import("fs");
          const path = await import("path");
          const webpPath = rawLogo.replace(/\.png$/i, ".webp");
          const projectRoot = process.cwd();
          const distFile = path.resolve(
            projectRoot,
            "dist",
            "public",
            webpPath.slice(1)
          );
          const pngDistFile = path.resolve(
            projectRoot,
            "dist",
            "public",
            rawLogo.slice(1)
          );
          if (fs.existsSync(distFile)) {
            // Check that the WebP is newer than or same age as the PNG
            // (prevents serving stale WebP from a previous logo upload)
            const pngExists = fs.existsSync(pngDistFile);
            if (pngExists) {
              const webpMtime = fs.statSync(distFile).mtimeMs;
              const pngMtime = fs.statSync(pngDistFile).mtimeMs;
              if (webpMtime >= pngMtime - 5000) {
                // WebP is current — serve it with cache bust
                logoUrl = webpPath + `?v=${Math.floor(webpMtime)}`;
              } else {
                // WebP is stale — regenerate from the newer PNG
                try {
                  const sharp = await import("sharp").then(m => m.default);
                  const pngBuf = fs.readFileSync(pngDistFile);
                  const webpBuf = await sharp(pngBuf)
                    .resize({ width: 512, withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                  fs.writeFileSync(distFile, webpBuf);
                  console.log(
                    `[SiteConfig] Re-generated stale WebP: ${webpPath} (${(webpBuf.length / 1024).toFixed(1)} KB)`
                  );
                  logoUrl = webpPath + `?v=${Date.now()}`;
                } catch {
                  logoUrl = rawLogo + `?v=${Math.floor(pngMtime)}`;
                }
              }
            } else {
              logoUrl =
                webpPath + `?v=${Math.floor(fs.statSync(distFile).mtimeMs)}`;
            }
          } else if (fs.existsSync(pngDistFile)) {
            // PNG exists but WebP doesn't — auto-generate it once (lazy migration)
            try {
              const sharp = await import("sharp").then(m => m.default);
              const pngBuf = fs.readFileSync(pngDistFile);
              const webpBuf = await sharp(pngBuf)
                .resize({ width: 512, withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
              fs.writeFileSync(distFile, webpBuf);
              console.log(
                `[SiteConfig] Auto-generated WebP: ${webpPath} (${(webpBuf.length / 1024).toFixed(1)} KB)`
              );
              logoUrl = webpPath + `?v=${Date.now()}`;
            } catch {
              const pngMtime = fs.statSync(pngDistFile).mtimeMs;
              logoUrl = rawLogo + `?v=${Math.floor(pngMtime)}`; // sharp unavailable — serve PNG
            }
          } else {
            // File not on disk (remote storage, first deploy, etc.) — still cache-bust
            logoUrl = rawLogo + `?v=${Date.now()}`;
          }
        } else {
          // Non-PNG logo (WebP, SVG, JPG) — serve as-is with cache bust from DB value
          logoUrl = rawLogoQuery ? rawLogoFull : rawLogo + `?v=${Date.now()}`;
        }
      }
      // For emails keep the original PNG (Outlook/Gmail don't fully support WebP)
      const emailLogo =
        rawLogo && !(rawLogo.startsWith("data:") && rawLogo.length > 50000)
          ? rawLogo
          : "/logo.png";
      // Parse banner messages — stored as JSON array of strings.
      // If not set, return null so the frontend falls back to its default i18n strings.
      let bannerMessages: string[] | null = null;
      if (bannerMessagesRaw) {
        try {
          bannerMessages = JSON.parse(bannerMessagesRaw);
        } catch {}
      }
      return {
        idVerificationEnabled,
        idVerificationMode,
        maintenance,
        storeHours: storeHoursConfig,
        paymentEmail:
          paymentEmail ||
          process.env.GMAIL_PAYMENT_EMAIL ||
          "payments@mylegacycannabis.ca",
        logoUrl,
        emailLogoUrl: emailLogo,
        bannerMessages,
      };
    }),
    products: publicProcedure
      .input(
        z.object({
          page: z.number().default(1),
          limit: z.number().default(50),
          category: z.string().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getAllProducts({ ...input, activeOnly: true });
      }),
    product: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getProductBySlug(input.slug);
      }),
    /** Return all weight variants for a given base product name (e.g. "Pink Taco" → 3.5g, 7g, 14g, 28g rows) */
    productVariants: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getProductVariants(input.slug);
      }),

    /** "Customers Also Bought" — returns up to 4 related products from the same category */
    relatedProducts: publicProcedure
      .input(
        z.object({
          productId: z.number(),
          category: z.string(),
          limit: z.number().default(4),
        })
      )
      .query(async ({ input }) => {
        const all = await db.getAllProducts({
          category: input.category,
          activeOnly: true,
          limit: 50,
          page: 1,
        });
        // Filter out current product's base name group, pick random sample
        const productsList =
          (all as any).data ||
          (all as any).products ||
          (Array.isArray(all) ? all : []);
        const others = productsList.filter(
          (p: any) => p.id !== input.productId
        );
        // Shuffle and take the requested amount
        const shuffled = others.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, input.limit);
      }),

    /** Homepage featured products — max 4, from DB (not hardcoded data.ts) */
    featuredProducts: publicProcedure.query(async () => {
      return db.getFeaturedProducts(4);
    }),

    /** Real-time active product counts per category (for homepage tiles) */
    categoryCounts: publicProcedure.query(async () => {
      return db.getCategoryCounts();
    }),

    // ═══════════════════════════════════════════════════════════════
    // PWA PUSH NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    /** Returns VAPID public key for client-side PushManager.subscribe() */
    pushConfig: publicProcedure.query(() => ({
      vapidPublicKey: getVapidPublicKey(),
      enabled: isPushServiceConfigured(),
    })),

    /** Save a push subscription from the browser */
    pushSubscribe: publicProcedure
      .input(
        z.object({
          endpoint: z.string().url(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id || null;
        const id = await db.savePushSubscription({
          userId,
          endpoint: input.endpoint,
          keysP256dh: input.keys.p256dh,
          keysAuth: input.keys.auth,
          userAgent: ctx.req.headers["user-agent"]?.substring(0, 500),
        });
        console.log(
          `[Push] Subscription saved (id=${id}, userId=${userId || "anon"})`
        );
        return { success: true, id };
      }),

    /** Remove a push subscription */
    pushUnsubscribe: publicProcedure
      .input(
        z.object({
          endpoint: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.removePushSubscription(input.endpoint);
        return { success: true };
      }),

    /** Admin: send a targeted push to a specific user */
    pushSendToUser: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          title: z.string().min(1).max(255),
          body: z.string().min(1).max(1000),
          url: z.string().optional(),
          tag: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await sendPushToUser(input.userId, {
          title: input.title,
          body: input.body,
          url: input.url,
          tag: input.tag || "admin",
        });
        return result;
      }),

    /** Admin: broadcast push to ALL active subscribers */
    pushBroadcast: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          body: z.string().min(1).max(1000),
          url: z.string().optional(),
          tag: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await broadcastPush({
          title: input.title,
          body: input.body,
          url: input.url,
          tag: input.tag || "broadcast",
        });
        return result;
      }),

    /** Admin: get push subscription stats */
    pushStats: adminProcedure.query(async () => {
      const stats = await db.getPushSubscriptionStats();
      const logs = await db.getPushNotificationLogs({ limit: 20 });
      return { ...stats, recentLogs: logs };
    }),

    /** Batch record user behavior events (page views, clicks, time-on-page, etc.) */
    trackBehavior: publicProcedure
      .input(
        z.object({
          events: z.array(
            z.object({
              sessionId: z.string(),
              eventType: z.enum([
                "page_view",
                "product_view",
                "category_view",
                "add_to_cart",
                "remove_from_cart",
                "search",
                "click",
                "checkout_start",
                "checkout_complete",
                "review_submit",
                "wishlist_add",
              ]),
              page: z.string().optional(),
              productId: z.number().optional(),
              productSlug: z.string().optional(),
              category: z.string().optional(),
              searchQuery: z.string().optional(),
              metadata: z.record(z.string(), z.any()).optional(),
              dwellTimeMs: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id || null;

        // ── Geo-enrichment (non-blocking, PIPEDA-safe) ──
        let geo: {
          ipHash: string;
          city: string;
          province: string;
          provinceCode: string;
          countryCode: string;
          isProxy: boolean;
        } | null = null;
        if (!isOptedOut(ctx.req)) {
          try {
            const ip = getClientIP(ctx.req);
            geo = await lookupGeo(ip);
          } catch {
            // Geo lookup failed — proceed without geo data
          }
        }

        await db.recordBehaviorEvents(
          input.events.map(e => ({
            ...e,
            userId,
            metadata: e.metadata ?? undefined,
            // Inject geo data into every event in the batch
            ...(geo
              ? {
                  ipHash: geo.ipHash,
                  city: geo.city,
                  province: geo.province,
                  provinceCode: geo.provinceCode,
                  countryCode: geo.countryCode,
                  isProxy: geo.isProxy,
                }
              : {}),
          }))
        );
        return { recorded: input.events.length };
      }),

    /** Get AI user memory/profile for the current user */
    aiMemory: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return null;
      const memory = await db.getAiUserMemory(userId);
      return memory;
    }),

    /** Get site-wide knowledge snapshot (for AI chat / recommendations) */
    siteKnowledge: publicProcedure
      .input(
        z.object({
          key: z.string(),
        })
      )
      .query(async ({ input }) => {
        return db.getSiteKnowledge(input.key);
      }),
    shippingZones: publicProcedure.query(async () => {
      return db.getAllShippingZones();
    }),

    // ─── CANADA POST SHIPPING RATES ───
    shippingRates: publicProcedure
      .input(
        z.object({
          postalCode: z.string(),
          weight: z.number().default(0.5),
          storeId: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const origin = getOriginPostal(input.storeId);
        const rates = await getShippingRates(
          origin,
          input.postalCode,
          input.weight
        );
        return { rates, configured: isCanadaPostConfigured() };
      }),

    // ─── CANADA POST TRACKING (public — for order tracking page) ───
    trackShipment: publicProcedure
      .input(
        z.object({
          pin: z.string(),
        })
      )
      .query(async ({ input }) => {
        const summary = await getTrackingSummary(input.pin);
        return summary;
      }),
    trackShipmentDetails: publicProcedure
      .input(
        z.object({
          pin: z.string(),
        })
      )
      .query(async ({ input }) => {
        const details = await getTrackingDetails(input.pin);
        return details;
      }),

    validatePostalCode: publicProcedure
      .input(
        z.object({
          code: z.string(),
        })
      )
      .query(async ({ input }) => {
        return validatePostalCode(input.code);
      }),
    submitOrder: publicProcedure
      .input(
        z.object({
          guestEmail: z.string().email(),
          guestName: z.string(),
          guestPhone: z.string().optional(),
          items: z.array(
            z.object({
              productId: z
                .any()
                .optional()
                .transform(v => {
                  const n = Number(v);
                  return isNaN(n) ? undefined : n;
                }),
              productName: z.string(),
              productImage: z.string().optional(),
              quantity: z.number(),
              price: z.string(),
            })
          ),
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
          // Canada Post shipping method fields
          shippingMethod: z.string().optional(), // e.g. DOM.XP
          shippingMethodName: z.string().optional(), // e.g. "Xpresspost"
          shippingOriginPostal: z.string().optional(),
          shippingDestPostal: z.string().optional(),
          estimatedDeliveryDays: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // ─── OUT-OF-STOCK GUARD ───
        const stockIssues = await db.checkStock(
          input.items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
          }))
        );
        if (stockIssues.length > 0) {
          throw new Error(`Out of stock: ${stockIssues.join(", ")}`);
        }

        // ─── COUPON VALIDATION ───
        let couponDiscount = "0";
        let couponCode: string | undefined;
        if (input.couponCode) {
          const couponResult = await db.validateCoupon(
            input.couponCode,
            parseFloat(input.subtotal),
            input.guestEmail
          );
          if (!couponResult.valid) {
            throw new Error(couponResult.error || "Invalid coupon code.");
          }
          couponDiscount = couponResult.discount.toFixed(2);
          couponCode = input.couponCode.toUpperCase();
        }

        // ─── RESOLVE USER ID ───
        // If logged in, use their ID directly. Otherwise try to match guest email to a registered user.
        let resolvedUserId: number | undefined = ctx.user?.id ?? undefined;
        if (!resolvedUserId && input.guestEmail) {
          const matchedUser = await db.getUserByEmail(input.guestEmail);
          if (matchedUser) resolvedUserId = matchedUser.id;
        }

        const orderNumber = `ML-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
        const orderId = await db.createOrder({
          orderNumber,
          userId: resolvedUserId ?? null,
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
          shippingMethod: input.shippingMethod,
          shippingMethodName: input.shippingMethodName,
          shippingOriginPostal: input.shippingOriginPostal,
          shippingDestPostal: input.shippingDestPostal,
          estimatedDeliveryDate: input.estimatedDeliveryDays
            ? new Date(Date.now() + input.estimatedDeliveryDays * 86_400_000)
            : undefined,
          status: "pending",
          paymentStatus: "pending",
        } as any);
        await db.createOrderItems(
          input.items.map(item => ({
            orderId,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            price: item.price,
          }))
        );

        // ─── STOCK DECREMENT ───
        await db.decrementStock(
          input.items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
          }))
        );

        // ─── UNIQUE CENT MATCHING (e-Transfer smart matching) ───
        // All orders use e-Transfer, so assign a unique cent amount for fallback matching
        let adjustedTotal = parseFloat(input.total);
        try {
          const reserved = await reserveUniqueCentAmount(
            parseFloat(input.total),
            orderId
          );
          if (reserved !== parseFloat(input.total)) {
            adjustedTotal = reserved;
            await db.updateOrder(orderId, {
              total: reserved.toFixed(2),
              originalTotal: input.total,
              centAdjusted: true,
            } as any);
            console.log(
              `[CentMatch] Order ${orderNumber}: $${input.total} -> $${reserved.toFixed(2)}`
            );
          }
        } catch (centErr) {
          console.warn(
            "[CentMatch] Failed to reserve unique cent — order uses original total:",
            (centErr as Error).message
          );
        }

        // ─── RECORD COUPON USAGE ───
        if (couponCode) {
          const coupon = await db.getCouponByCode(couponCode);
          if (coupon) {
            await db.recordCouponUsage({
              couponId: coupon.id,
              orderId,
              email: input.guestEmail,
            });
          }
        }

        // Fire-and-forget — never block the customer's order confirmation
        notifyOwnerAsync({
          title: `New Order: ${orderNumber}`,
          content: `New order from ${input.guestName} (${input.guestEmail}) — Total: $${input.total}`,
        });

        // Send templated order confirmation to customer
        const itemsSummary = input.items
          .map(i => `${i.quantity}x ${i.productName} ($${i.price})`)
          .join("<br>");
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
          isGuest: !resolvedUserId,
        }).catch(err =>
          console.warn("[Order] Confirmation email failed:", err.message)
        );

        // ─── REFRESH AI MEMORY for linked user (fire-and-forget) ───
        if (resolvedUserId) {
          db.refreshAiUserMemory(resolvedUserId).catch(err =>
            console.error(
              `[AiMemory] Post-order refresh failed for user #${resolvedUserId}:`,
              err
            )
          );
        }

        return {
          orderNumber,
          orderId,
          adjustedTotal: adjustedTotal.toFixed(2),
        };
      }),
    // ─── VALIDATE COUPON (public — for checkout preview) ───
    validateCoupon: publicProcedure
      .input(
        z.object({
          code: z.string().min(1),
          subtotal: z.number(),
          email: z.string().email(),
        })
      )
      .query(async ({ input }) => {
        return db.validateCoupon(input.code, input.subtotal, input.email);
      }),
    // ─── SUBMIT PRODUCT REVIEW (authenticated) ───
    submitReview: protectedProcedure
      .input(
        z.object({
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
          experienceLevel: z
            .enum(["beginner", "intermediate", "experienced"])
            .optional(),
          usageTiming: z.enum(["daytime", "nighttime", "anytime"]).optional(),
          wouldRecommend: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) throw new Error("Not authenticated");
        // Check for duplicate review on same product
        const existing = await db.getUserReviews(userId);
        if (existing.some((r: any) => r.productId === input.productId)) {
          throw new Error("You have already reviewed this product.");
        }
        // Reviews appear immediately (isApproved = true)
        const id = await db.createProductReview({
          userId,
          ...input,
          isApproved: true,
        } as any);
        // Async refresh AI memory to include this new review
        db.refreshAiUserMemory(userId).catch(err =>
          console.error(`[AiMemory] Failed to refresh after review:`, err)
        );
        return {
          id,
          message: "Review submitted! Thank you for your feedback.",
        };
      }),
    // ─── UPDATE OWN REVIEW (authenticated) ───
    updateReview: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          rating: z.number().min(1).max(5).optional(),
          title: z.string().max(255).optional(),
          body: z.string().max(2000).optional(),
          tags: z.array(z.string()).optional(),
          strengthRating: z.number().min(1).max(5).optional(),
          smoothnessRating: z.number().min(1).max(5).optional(),
          effectTags: z.array(z.string()).optional(),
          experienceLevel: z
            .enum(["beginner", "intermediate", "experienced"])
            .optional(),
          usageTiming: z.enum(["daytime", "nighttime", "anytime"]).optional(),
          wouldRecommend: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) throw new Error("Not authenticated");
        const review = await db.getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found.");
        if (review.userId !== userId)
          throw new Error("You can only edit your own reviews.");
        const { reviewId, ...updateData } = input;
        await db.updateProductReview(reviewId, updateData as any);
        return { success: true, message: "Review updated successfully." };
      }),
    // ─── GET PRODUCT REVIEWS (public) ───
    productReviews: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const reviews = await db.getProductReviews(input.productId);
        // Compute aggregate stats
        const count = reviews.length;
        const avgRating =
          count > 0
            ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / count
            : 0;
        // Aggregate tag counts
        const tagCounts: Record<string, number> = {};
        const effectCounts: Record<string, number> = {};
        let strengthSum = 0,
          strengthCount = 0;
        let smoothnessSum = 0,
          smoothnessCount = 0;
        let recommendCount = 0;
        for (const r of reviews as any[]) {
          if (r.tags)
            for (const t of r.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
          if (r.effectTags)
            for (const t of r.effectTags)
              effectCounts[t] = (effectCounts[t] || 0) + 1;
          if (r.strengthRating) {
            strengthSum += r.strengthRating;
            strengthCount++;
          }
          if (r.smoothnessRating) {
            smoothnessSum += r.smoothnessRating;
            smoothnessCount++;
          }
          if (r.wouldRecommend) recommendCount++;
        }
        return {
          reviews,
          aggregate: {
            count,
            avgRating: Math.round(avgRating * 10) / 10,
            avgStrength:
              strengthCount > 0
                ? Math.round((strengthSum / strengthCount) * 10) / 10
                : null,
            avgSmoothness:
              smoothnessCount > 0
                ? Math.round((smoothnessSum / smoothnessCount) * 10) / 10
                : null,
            recommendPercent:
              count > 0 ? Math.round((recommendCount / count) * 100) : null,
            topTags: Object.entries(tagCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([tag, ct]) => ({ tag, count: ct })),
            topEffects: Object.entries(effectCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([tag, ct]) => ({ tag, count: ct })),
          },
        };
      }),
    // ─── GET REFERRAL CODE (authenticated) ───
    myReferralCode: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Not authenticated");
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
    applyReferral: publicProcedure
      .input(
        z.object({
          code: z.string().min(1),
          refereeEmail: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const REFERRAL_BONUS_REFERRER = 50;
        const REFERRAL_BONUS_REFEREE = 25;
        const refCode = await db.getReferralCodeByCode(input.code);
        if (!refCode)
          return { success: false, error: "Invalid referral code." };
        const referee = await db.getUserByEmail(input.refereeEmail);
        if (!referee)
          return { success: false, error: "Referee user not found." };
        if (referee.id === refCode.userId)
          return { success: false, error: "Cannot refer yourself." };
        // Award points to both
        const referrer = await db.getUserById(refCode.userId);
        if (referrer) {
          await db.updateUser(referrer.id, {
            rewardPoints:
              (referrer.rewardPoints || 0) + REFERRAL_BONUS_REFERRER,
          } as any);
          await db.addRewardsHistory({
            userId: referrer.id,
            points: REFERRAL_BONUS_REFERRER,
            type: "referral" as any,
            description: `Referral bonus: ${referee.name || referee.email} joined using your code`,
          } as any);
        }
        await db.updateUser(referee.id, {
          rewardPoints: (referee.rewardPoints || 0) + REFERRAL_BONUS_REFEREE,
          referredBy: refCode.userId,
        } as any);
        await db.addRewardsHistory({
          userId: referee.id,
          points: REFERRAL_BONUS_REFEREE,
          type: "referral" as any,
          description: `Welcome bonus: Used referral code ${input.code}`,
        } as any);
        await db.trackReferral({
          referrerId: refCode.userId,
          refereeId: referee.id,
          referralCodeId: refCode.id,
          referrerPointsAwarded: true,
          refereePointsAwarded: true,
        });
        return {
          success: true,
          referrerPoints: REFERRAL_BONUS_REFERRER,
          refereePoints: REFERRAL_BONUS_REFEREE,
        };
      }),
    // ─── REWARDS HISTORY (authenticated) ───
    rewardsHistory: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return [];
      return db.getRewardsHistoryByUser(userId);
    }),
    submitVerification: publicProcedure
      .input(
        z.object({
          guestEmail: z.string().optional(),
          guestName: z.string().optional(),
          frontImageBase64: z.string(),
          selfieImageBase64: z.string().optional(),
          idType: z.string().optional(),
          contentType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if ID verification is enabled
        const idVerifEnabled = await db.isIdVerificationEnabled();
        if (!idVerifEnabled) {
          return {
            id: 0,
            status: "skipped" as const,
            message: "ID verification is not currently required.",
          };
        }
        const frontKey = `id-verifications/${nanoid()}-front.jpg`;
        const frontBuffer = Buffer.from(input.frontImageBase64, "base64");
        const { url: frontUrl } = await storagePut(
          frontKey,
          frontBuffer,
          input.contentType
        );
        let selfieUrl: string | undefined;
        if (input.selfieImageBase64) {
          const selfieKey = `id-verifications/${nanoid()}-selfie.jpg`;
          const selfieBuffer = Buffer.from(input.selfieImageBase64, "base64");
          const result = await storagePut(
            selfieKey,
            selfieBuffer,
            input.contentType
          );
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

        // Check if AI verification mode is enabled
        const verificationMode = await db.getIdVerificationMode();

        if (verificationMode === "ai") {
          // ─── AI-POWERED AUTO-VERIFICATION ───
          // Use the configured LLM with vision to verify the ID
          (async () => {
            try {
              const aiResult = await invokeLLM({
                messages: [
                  {
                    role: "system",
                    content: `You are an ID verification specialist for MyLegacy Cannabis, a Canadian cannabis delivery service.
Your job is to verify that submitted ID documents are valid Canadian government-issued photo IDs showing the holder is 19 years of age or older.

ACCEPTABLE IDs:
- Canadian Driver's License (any province)
- Canadian Passport
- Provincial Health Card (with photo)
- Canadian Citizenship Card
- NEXUS card
- Permanent Resident Card

VERIFICATION CRITERIA:
1. The image must show a recognizable government-issued ID document
2. The ID must appear to be from Canada
3. The birth date on the ID must show the person is 19+ years old (current date: ${new Date().toISOString().split("T")[0]})
4. The ID should not appear obviously fake, damaged beyond recognition, or expired (if expiry is visible)

RESPONSE FORMAT (JSON):
{
  "approved": true/false,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation of the decision",
  "name_on_id": "Name visible on the ID or null",
  "dob_visible": "YYYY-MM-DD or null if not readable",
  "id_type_detected": "drivers_license | passport | health_card | other",
  "age_verified": true/false
}

Be strict but fair. If the image is too blurry to read, reject it. If you can clearly see a valid Canadian ID with a birth date showing 19+, approve it.`,
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `Please verify this ID submission. ID type claimed: ${input.idType || "not specified"}. Customer name: ${input.guestName || "not provided"}.`,
                      },
                      {
                        type: "image_url",
                        image_url: { url: frontUrl, detail: "high" },
                      },
                    ],
                  },
                ],
                responseFormat: { type: "json_object" },
                maxTokens: 1024,
              });

              const content =
                typeof aiResult.choices[0]?.message?.content === "string"
                  ? aiResult.choices[0].message.content
                  : "";

              if (!content) {
                console.warn(
                  "[AI Verify] Empty AI response — falling back to manual review"
                );
                return;
              }

              const cleaned = content
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
              let parsed: any;
              try {
                parsed = JSON.parse(cleaned);
              } catch {
                console.warn(
                  "[AI Verify] Failed to parse AI response — falling back to manual review"
                );
                return;
              }

              const aiApproved =
                parsed.approved === true &&
                (parsed.confidence === "high" ||
                  parsed.confidence === "medium");
              const aiNotes = `[AI Verification] ${parsed.approved ? "APPROVED" : "NEEDS REVIEW"} (confidence: ${parsed.confidence})\nReason: ${parsed.reason || "N/A"}${parsed.name_on_id ? `\nName on ID: ${parsed.name_on_id}` : ""}${parsed.dob_visible ? `\nDOB: ${parsed.dob_visible}` : ""}${parsed.id_type_detected ? `\nID type detected: ${parsed.id_type_detected}` : ""}`;

              if (aiApproved) {
                // Auto-approve
                await db.updateVerification(id, {
                  status: "approved",
                  reviewedBy: 0,
                  reviewedAt: new Date(),
                  reviewNotes: aiNotes,
                });

                // Mark user as verified
                const verification = await db.getVerificationById(id);
                if (verification) {
                  if (verification.userId) {
                    await db.updateUser(verification.userId, {
                      idVerified: true,
                    });
                  } else if (verification.guestEmail) {
                    const linkedUser = await db.getUserByEmail(
                      verification.guestEmail
                    );
                    if (linkedUser) {
                      await db.updateUser(linkedUser.id, { idVerified: true });
                    }
                  }

                  // Clear [ID VERIFICATION PENDING] from orders
                  if (verification.guestEmail) {
                    const allOrders = await db.getAllOrders({ limit: 1000 });
                    for (const order of allOrders.data) {
                      if (
                        order.notes &&
                        typeof order.notes === "string" &&
                        order.notes.includes("[ID VERIFICATION PENDING]") &&
                        order.guestEmail?.toLowerCase() ===
                          verification.guestEmail.toLowerCase()
                      ) {
                        const cleanedNotes =
                          order.notes
                            .split("\n")
                            .filter(
                              (line: string) =>
                                !line.includes("[ID VERIFICATION PENDING]")
                            )
                            .join("\n")
                            .trim() || null;
                        await db.updateOrder(order.id, {
                          notes: cleanedNotes,
                        } as any);
                      }
                    }
                  }
                }

                // Send approval email
                const cEmail = input.guestEmail || "";
                const cName = input.guestName || "Customer";
                if (cEmail) {
                  triggerIdApproved({
                    customerName: cName,
                    customerEmail: cEmail,
                    isGuest: !ctx.user,
                  }).catch(err =>
                    console.warn(
                      "[AI Verify] Approved email failed:",
                      err.message
                    )
                  );
                }

                await db.logAdminActivity({
                  adminId: 0,
                  adminName: "AI System",
                  action: "ai_approved",
                  entityType: "verification",
                  entityId: id,
                  details: `AI auto-approved verification #${id}: ${parsed.reason}`,
                });

                console.log(
                  `[AI Verify] Auto-approved verification #${id} (confidence: ${parsed.confidence})`
                );
              } else {
                // Low confidence or rejected — add AI notes but leave as pending for manual review
                await db.updateVerification(id, {
                  reviewNotes: aiNotes,
                });

                await db.logAdminActivity({
                  adminId: 0,
                  adminName: "AI System",
                  action: "ai_flagged",
                  entityType: "verification",
                  entityId: id,
                  details: `AI flagged verification #${id} for manual review: ${parsed.reason}`,
                });

                console.log(
                  `[AI Verify] Flagged verification #${id} for manual review (confidence: ${parsed.confidence})`
                );

                // Still notify admin for manual review
                notifyOwnerAsync({
                  title: "ID Verification Needs Manual Review",
                  content: `AI flagged verification #${id} from ${input.guestName || input.guestEmail || "Guest"}: ${parsed.reason}`,
                });
                triggerIdSubmitted({
                  customerName: input.guestName || "Guest",
                  customerEmail: input.guestEmail || "",
                  userId: ctx.user?.id,
                  verificationId: id,
                  idType: input.idType,
                  isGuest: !ctx.user,
                }).catch(err =>
                  console.warn("[AI Verify] Admin email failed:", err.message)
                );
              }
            } catch (aiErr: any) {
              console.error(
                "[AI Verify] AI verification failed — falling back to manual review:",
                aiErr.message
              );
              // On AI failure, notify admin for manual review
              notifyOwnerAsync({
                title: "New ID Verification Submitted",
                content: `Verification #${id} from ${input.guestName || input.guestEmail || "Guest"} needs review (AI unavailable).`,
              });
              triggerIdSubmitted({
                customerName: input.guestName || "Guest",
                customerEmail: input.guestEmail || "",
                userId: ctx.user?.id,
                verificationId: id,
                idType: input.idType,
                isGuest: !ctx.user,
              }).catch(err =>
                console.warn("[Verification] Admin email failed:", err.message)
              );
            }
          })();

          return {
            id,
            status: "pending",
            message: "Your ID is being reviewed automatically.",
          };
        }

        // ─── MANUAL MODE: standard flow ───
        // Fire-and-forget — never block the customer's verification submission
        notifyOwnerAsync({
          title: "New ID Verification Submitted",
          content: `Verification #${id} from ${input.guestName || input.guestEmail || "Guest"} needs review.`,
        });

        // Send templated admin notification
        triggerIdSubmitted({
          customerName: input.guestName || "Guest",
          customerEmail: input.guestEmail || "",
          userId: ctx.user?.id,
          verificationId: id,
          idType: input.idType,
          isGuest: !ctx.user,
        }).catch(err =>
          console.warn("[Verification] Admin email failed:", err.message)
        );

        return { id, status: "pending" };
      }),
  }),

  // ─── E-TRANSFER PAYMENT MATCHING ───
  etransfer: router({
    // Admin: list all payment records
    list: adminProcedure
      .input(
        z
          .object({
            page: z.number().optional(),
            limit: z.number().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
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
    manualMatch: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          orderId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // ─── 1:1 CARDINALITY GUARD: prevent double-matching ───
        const alreadyMatched = await db.isOrderAlreadyMatched(input.orderId);
        if (alreadyMatched) {
          throw new Error(
            "This order already has a matched payment. Each order can only be linked to one payment."
          );
        }

        const success = await manualMatchPayment(
          input.paymentId,
          input.orderId,
          ctx.user?.id || 0
        );
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

    // Admin: reassign a payment from one order to another
    reassign: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          newOrderId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // ─── 1:1 CARDINALITY GUARD: prevent double-matching on the NEW order ───
        const alreadyMatched = await db.isOrderAlreadyMatched(input.newOrderId);
        if (alreadyMatched) {
          throw new Error(
            "The target order already has a matched payment. Each order can only be linked to one payment."
          );
        }

        // Get the current payment record to find the old order
        const allRecords = await db.exportAllPaymentRecords();
        const paymentRecord = allRecords.find(
          (r: any) => r.id === input.paymentId
        );
        if (!paymentRecord) throw new Error("Payment record not found");

        const oldOrderId = paymentRecord.matchedOrderId;
        const oldOrderNumber = paymentRecord.matchedOrderNumber;

        // Get the new order details
        const newOrder = await db.getOrderById(input.newOrderId);
        if (!newOrder) throw new Error("Target order not found");

        // Revert the old order's payment status back to pending (if it was set by this payment)
        if (oldOrderId) {
          await db.updateOrder(oldOrderId, { paymentStatus: "pending" } as any);
          console.log(
            `[Reassign] Reverted old order #${oldOrderId} payment to pending`
          );
        }

        // Update the payment record to point to the new order
        await db.updatePaymentRecord(input.paymentId, {
          matchedOrderId: input.newOrderId,
          matchedOrderNumber: newOrder.orderNumber,
          status: "manual_matched" as any,
          matchMethod: "manual_reassign",
          matchConfidence: "exact" as any,
          reviewedBy: ctx.user?.id || 0,
          reviewedAt: new Date(),
        } as any);

        // Set the new order's payment status to received (admin must then confirm)
        await db.updateOrder(input.newOrderId, {
          paymentStatus: "received",
        } as any);

        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "etransfer_reassign",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Reassigned payment #${input.paymentId} from order ${oldOrderNumber || oldOrderId || "none"} → order ${newOrder.orderNumber}`,
        });

        console.log(
          `[Reassign] Payment #${input.paymentId}: ${oldOrderNumber || "unmatched"} → ${newOrder.orderNumber}`
        );
        return { success: true };
      }),

    // Admin: unmatch a payment (detach from its order)
    unmatch: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const allRecords = await db.exportAllPaymentRecords();
        const paymentRecord = allRecords.find(
          (r: any) => r.id === input.paymentId
        );
        if (!paymentRecord) throw new Error("Payment record not found");

        const oldOrderId = paymentRecord.matchedOrderId;
        const oldOrderNumber = paymentRecord.matchedOrderNumber;

        // Revert the order's payment status back to pending
        if (oldOrderId) {
          await db.updateOrder(oldOrderId, { paymentStatus: "pending" } as any);
        }

        // Clear the match from the payment record
        await db.updatePaymentRecord(input.paymentId, {
          matchedOrderId: null,
          matchedOrderNumber: null,
          status: "unmatched" as any,
          matchConfidence: "none" as any,
          matchMethod: null,
          reviewedBy: ctx.user?.id || 0,
          reviewedAt: new Date(),
          adminNotes: `Unmatched by ${ctx.user?.name || "Admin"} (was: ${oldOrderNumber || oldOrderId || "none"})`,
        } as any);

        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "etransfer_unmatch",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Unmatched payment #${input.paymentId} from order ${oldOrderNumber || oldOrderId || "none"}`,
        });

        return { success: true };
      }),

    // Admin: ignore a payment record
    ignore: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const adminName = ctx.user?.name || "Admin";
        await db.updatePaymentRecord(input.paymentId, {
          status: "ignored" as any,
          reviewedBy: ctx.user?.id || 0,
          reviewedAt: new Date(),
          adminNotes: input.notes || `Ignored by ${adminName}`,
        } as any);
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName,
          action: "etransfer_ignore",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Ignored payment #${input.paymentId}`,
        });
        return { success: true };
      }),

    // Admin: change payment status (with guards for data integrity)
    changeStatus: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          status: z.enum([
            "auto_matched",
            "manual_matched",
            "unmatched",
            "ignored",
          ]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const adminName = ctx.user?.name || "Admin";
        const allRecords = await db.exportAllPaymentRecords();
        const record = allRecords.find((r: any) => r.id === input.paymentId);
        if (!record) throw new Error("Payment record not found");

        const oldStatus = record.status;
        const isMatchedTarget =
          input.status === "auto_matched" || input.status === "manual_matched";
        const wasMatched =
          oldStatus === "auto_matched" || oldStatus === "manual_matched";
        const isUnmatchTarget =
          input.status === "unmatched" || input.status === "ignored";

        // ─── GUARD: Cannot set to "matched" without a linked order ───
        if (isMatchedTarget && !record.matchedOrderId) {
          throw new Error(
            `Cannot set status to "${input.status}" — no order is linked. ` +
              `Use the "Match to Order" dropdown to link an order first.`
          );
        }

        // ─── GUARD: When reverting a matched payment to unmatched/ignored, ───
        // ─── clear the order link and revert the order's payment status   ───
        const updateData: Record<string, any> = {
          status: input.status,
          reviewedBy: ctx.user?.id || 0,
          reviewedAt: new Date(),
          adminNotes:
            input.notes ||
            `Status changed from ${oldStatus} to ${input.status} by ${adminName}`,
        };

        if (wasMatched && isUnmatchTarget && record.matchedOrderId) {
          // Revert the order's payment status to pending
          await db.updateOrder(record.matchedOrderId, {
            paymentStatus: "pending",
          } as any);
          // Clear the match fields on the payment record
          updateData.matchedOrderId = null;
          updateData.matchedOrderNumber = null;
          updateData.matchConfidence = "none";
          updateData.matchMethod = null;
        }

        await db.updatePaymentRecord(input.paymentId, updateData as any);

        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName,
          action: "etransfer_change_status",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Changed payment #${input.paymentId} status: ${oldStatus} → ${input.status}${wasMatched && isUnmatchTarget ? ` (order ${record.matchedOrderNumber || record.matchedOrderId} unlinked)` : ""}`,
        });

        return { success: true, oldStatus, newStatus: input.status };
      }),

    // Admin: trigger a manual poll
    poll: adminProcedure.mutation(async () => {
      if (!isETransferServiceConfigured()) {
        throw new Error(
          "Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN."
        );
      }
      const stats = await pollETransferEmails();
      return stats;
    }),

    // Admin: check if service is configured + get/set payment email
    status: adminProcedure.query(async () => {
      const savedEmail = await db.getSiteSetting("payment_email");
      return {
        configured: isETransferServiceConfigured(),
        paymentEmail:
          savedEmail ||
          process.env.GMAIL_PAYMENT_EMAIL ||
          "payments@mylegacycannabis.ca",
      };
    }),

    // Admin: update the customer-facing payment email address
    updatePaymentEmail: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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

    // Admin: export ALL payment records (no pagination) for CSV download
    exportAll: adminProcedure.query(async () => {
      const records = await db.exportAllPaymentRecords();
      return records;
    }),

    // Admin: delete a single payment record
    deleteRecord: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.deletePaymentRecord(input.paymentId);
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "delete_payment_record",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Deleted payment record #${input.paymentId}`,
        });
        return { success: true };
      }),

    // Admin: wipe all payment history
    clearHistory: adminProcedure.mutation(async ({ ctx }) => {
      const deleted = await db.clearAllPaymentRecords();
      await db.logAdminActivity({
        adminId: ctx.user?.id || 0,
        adminName: ctx.user?.name || "Admin",
        action: "clear_payment_history",
        entityType: "payment",
        entityId: 0,
        details: `Cleared all payment history (${deleted} records deleted)`,
      });
      return { success: true, deleted };
    }),

    // ─── KEYWORD RULES (admin-configurable AND/OR e-Transfer detection) ───
    getKeywordRules: adminProcedure.query(async () => {
      return getKeywordRules();
    }),

    saveKeywordRules: adminProcedure
      .input(
        z.array(
          z.object({
            id: z.string(),
            name: z.string().min(1).max(100),
            operator: z.enum(["AND", "OR"]),
            keywords: z.array(z.string().min(1).max(200)),
            enabled: z.boolean(),
          })
        )
      )
      .mutation(async ({ input, ctx }) => {
        await db.setSiteSetting(
          "etransfer_keyword_rules",
          JSON.stringify(input)
        );
        clearKeywordRulesCache();
        await db.logAdminActivity({
          adminId: ctx.user?.id || 0,
          adminName: ctx.user?.name || "Admin",
          action: "update_etransfer_keywords",
          entityType: "site_setting",
          entityId: 0,
          details: `Updated e-Transfer keyword rules (${input.length} rule(s), ${input.filter(r => r.enabled).length} enabled)`,
        });
        return { success: true, count: input.length };
      }),

    testKeywordRules: adminProcedure
      .input(
        z.object({
          subject: z.string(),
          body: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const rules = await getKeywordRules();
        const enabledRules = rules.filter(r => r.enabled);
        const combined = `${input.subject} ${input.body}`;
        const lower = combined.toLowerCase();

        // Test each rule individually
        const ruleResults = enabledRules.map(rule => {
          const keywordResults = rule.keywords.map(kw => ({
            keyword: kw,
            found: lower.includes(kw.toLowerCase()),
          }));
          const match =
            rule.operator === "AND"
              ? keywordResults.every(r => r.found)
              : keywordResults.some(r => r.found);
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            operator: rule.operator,
            match,
            keywordResults,
          };
        });

        // Test defaults too
        const defaultMatch = DEFAULT_ETRANSFER_INDICATORS_FOR_TEST.some(p =>
          p.test(combined)
        );

        return {
          overallMatch: ruleResults.some(r => r.match) || defaultMatch,
          customRulesMatch: ruleResults.some(r => r.match),
          defaultMatch,
          ruleResults,
        };
      }),

    // ─── SMART MATCHING: Unmatched payments with likely match suggestions ───
    getUnmatchedPayments: adminProcedure.query(async () => {
      return db.getUnmatchedPayments();
    }),

    resolveUnmatchedPayment: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          orderId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Confirm the payment -> update the order
        await db.updateOrder(input.orderId, {
          paymentStatus: "received",
          paymentMatchMethod: "admin-manual",
        } as any);

        // Mark the unmatched payment as resolved
        await db.updateUnmatchedPayment(input.paymentId, {
          status: "resolved",
          resolvedOrderId: input.orderId,
          resolvedBy: ctx.user?.name || "admin",
          resolvedAt: new Date(),
        } as any);

        await db.logAdminActivity({
          adminId: ctx.user?.id ?? 0,
          adminName: ctx.user?.name ?? "admin",
          action: "resolve_unmatched_payment",
          entityType: "unmatched_payment",
          entityId: input.paymentId,
          details: `Resolved payment #${input.paymentId} -> order #${input.orderId}`,
        });

        return { success: true };
      }),

    dismissUnmatchedPayment: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateUnmatchedPayment(input.paymentId, {
          status: "dismissed",
          resolvedBy: ctx.user?.name || "admin",
          resolvedAt: new Date(),
        } as any);

        await db.logAdminActivity({
          adminId: ctx.user?.id ?? 0,
          adminName: ctx.user?.name ?? "admin",
          action: "dismiss_unmatched_payment",
          entityType: "unmatched_payment",
          entityId: input.paymentId,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
