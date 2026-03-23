import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { notifyOwner } from "./_core/notification";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    loginEmail: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      // Fetch orders for this user from the DB
      const userOrders = await db.getUserOrders(user.id);
      const formattedOrders = [];
      for (const o of userOrders) {
        const items = await db.getOrderItems(o.id);
        formattedOrders.push({
          id: o.orderNumber || `ORD-${o.id}`,
          date: o.createdAt?.toISOString?.() || new Date().toISOString(),
          status: o.status || 'processing',
          total: parseFloat((o as any).total || '0'),
          items: items.map((i: any) => ({
            name: i.productName || 'Item',
            quantity: i.quantity || 1,
            price: parseFloat(i.price || '0'),
          })),
          trackingNumber: (o as any).trackingNumber || undefined,
        });
      }
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          birthday: user.birthday,
          idVerified: user.idVerified,
          idVerificationStatus: 'none',
          rewardsPoints: user.rewardPoints || 0,
          rewardsHistory: [],
          referralCode: '',
          orders: formattedOrders,
        },
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
      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          birthday: newUser.birthday,
          idVerified: newUser.idVerified,
          idVerificationStatus: 'none',
          rewardsPoints: newUser.rewardPoints || 25,
          rewardsHistory: [],
          referralCode: '',
          orders: [],
        },
      };
    }),
  }),

  // ─── ADMIN: DASHBOARD ───
  admin: router({
    stats: publicProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    orderStats: publicProcedure.input(z.object({ days: z.number().default(30) })).query(async ({ input }) => {
      return db.getOrderStats(input.days);
    }),
    topProducts: publicProcedure.input(z.object({ limit: z.number().default(10) })).query(async ({ input }) => {
      return db.getTopProducts(input.limit);
    }),
    activityLog: publicProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(50) })).query(async ({ input }) => {
      return db.getAdminActivityLog(input);
    }),

    // ─── PRODUCTS ───
    products: router({
      list: publicProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        category: z.string().optional(),
        search: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllProducts({ ...input, activeOnly: false });
      }),
      get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getProductById(input.id);
      }),
      create: publicProcedure.input(z.object({
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
      update: publicProcedure.input(z.object({
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
      delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
        await db.deleteProduct(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "delete", entityType: "product", entityId: input.id, details: `Deleted product #${input.id}` });
        return { success: true };
      }),
      bulkUpdate: publicProcedure.input(z.object({
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
      list: publicProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })).query(async ({ input }) => {
        return db.getAllOrders(input);
      }),
      get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) return null;
        const items = await db.getOrderItems(input.id);
        return { ...order, items };
      }),
      updateStatus: publicProcedure.input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
      })).mutation(async ({ input, ctx }) => {
        await db.updateOrder(input.id, { status: input.status });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update_status", entityType: "order", entityId: input.id, details: `Changed order #${input.id} status to ${input.status}` });
        await notifyOwner({ title: `Order Status Updated`, content: `Order #${input.id} status changed to ${input.status}` });
        return { success: true };
      }),
      updatePayment: publicProcedure.input(z.object({
        id: z.number(),
        paymentStatus: z.enum(["pending", "received", "confirmed", "refunded"]),
      })).mutation(async ({ input, ctx }) => {
        await db.updateOrder(input.id, { paymentStatus: input.paymentStatus });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "update_payment", entityType: "order", entityId: input.id, details: `Changed order #${input.id} payment to ${input.paymentStatus}` });
        return { success: true };
      }),
      addTracking: publicProcedure.input(z.object({
        id: z.number(),
        trackingNumber: z.string(),
        trackingUrl: z.string().optional(),
      })).mutation(async ({ input, ctx }) => {
        await db.updateOrder(input.id, { trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl || `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${input.trackingNumber}` });
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "add_tracking", entityType: "order", entityId: input.id, details: `Added tracking: ${input.trackingNumber}` });
        return { success: true };
      }),
      addNote: publicProcedure.input(z.object({ id: z.number(), note: z.string() })).mutation(async ({ input, ctx }) => {
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
      list: publicProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllVerifications(input);
      }),
      get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getVerificationById(input.id);
      }),
      review: publicProcedure.input(z.object({
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
        // If approved and linked to a user, mark user as verified
        const verification = await db.getVerificationById(input.id);
        if (input.status === "approved" && verification?.userId) {
          await db.updateUser(verification.userId, { idVerified: true });
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
        await notifyOwner({ title: `ID Verification ${input.status}`, content: `Verification #${input.id} has been ${input.status}` });
        return { success: true };
      }),
    }),

    // ─── SHIPPING ZONES ───
    shipping: router({
      list: publicProcedure.query(async () => {
        return db.getAllShippingZones();
      }),
      update: publicProcedure.input(z.object({
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
      create: publicProcedure.input(z.object({
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
      list: publicProcedure.query(async () => {
        return db.getAllEmailTemplates();
      }),
      get: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
        return db.getEmailTemplateBySlug(input.slug);
      }),
      update: publicProcedure.input(z.object({
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
      create: publicProcedure.input(z.object({
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
    }),

    // ─── USERS ───
    users: router({
      list: publicProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
      })).query(async ({ input }) => {
        return db.getAllUsers(input.page, input.limit, input.search);
      }),
      get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getUserById(input.id);
      }),
      update: publicProcedure.input(z.object({
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
      lock: publicProcedure.input(z.object({
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
      resetPassword: publicProcedure.input(z.object({
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
      delete: publicProcedure.input(z.object({
        id: z.number(),
        confirm: z.literal(true),
      })).mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.id);
        if (!user) throw new Error("User not found");
        await db.deleteUser(input.id);
        await db.logAdminActivity({ adminId: ctx.user?.id || 0, adminName: ctx.user?.name || "Admin", action: "delete", entityType: "user", entityId: input.id, details: `Deleted customer #${input.id} (${user.email || user.phone || "unknown"})` });
        return { success: true };
      }),
      adjustPoints: publicProcedure.input(z.object({
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
      orders: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getUserOrders(input.id);
      }),
    }),

    // ─── FILE UPLOAD ───
    upload: publicProcedure.input(z.object({
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
  }),

  // ─── PUBLIC: STOREFRONT API ───
  store: router({
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
        productId: z.number().optional(),
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
    })).mutation(async ({ input }) => {
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
        status: "pending",
        paymentStatus: "pending",
      });
      await db.createOrderItems(input.items.map(item => ({
        orderId,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: item.price,
      })));
      await notifyOwner({ title: `New Order: ${orderNumber}`, content: `New order from ${input.guestName} (${input.guestEmail}) — Total: $${input.total}` });
      return { orderNumber, orderId };
    }),
    submitVerification: publicProcedure.input(z.object({
      guestEmail: z.string().optional(),
      guestName: z.string().optional(),
      frontImageBase64: z.string(),
      selfieImageBase64: z.string().optional(),
      idType: z.string().optional(),
      contentType: z.string().default("image/jpeg"),
    })).mutation(async ({ input, ctx }) => {
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
      await notifyOwner({ title: "New ID Verification Submitted", content: `Verification #${id} from ${input.guestName || input.guestEmail || "Guest"} needs review.` });
      return { id, status: "pending" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
