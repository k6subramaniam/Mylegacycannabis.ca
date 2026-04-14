import "dotenv/config";
import dns from "dns";
// Railway blocks outbound IPv6 SMTP (QDISC_DROP). Force IPv4 for all DNS lookups
// so nodemailer and any other net connections resolve to IPv4 addresses.
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerCustomAuthRoutes } from "../customAuth";
import { registerVerifyRoutes } from "../verifyRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import {
  lookupGeo,
  getClientIP,
  hashIP,
  getGeoCacheStats,
} from "../geolocation";
import {
  initializeDatabase,
  USE_PERSISTENT_DB,
  autoCancelUnpaidOrders,
  checkBirthdayBonuses,
  fileStoreGetAll,
  fileStorePut,
  refreshAllAiUserMemories,
  syncAllSiteKnowledge,
  backfillOrderUserIds,
  getNearestStore,
  getAllOrders,
  updateOrder,
  getOrderById,
  logAdminActivity,
  awardOrderPoints,
} from "../db";
import {
  pollETransferEmails,
  isETransferServiceConfigured,
} from "../etransferService";
import {
  pollTrackingEmails,
  isTrackingServiceConfigured,
} from "../trackingService";
import {
  isGmailDisabled,
  getGmailStatus,
  resetGmailCircuitBreaker,
} from "../gmailAuth";
import {
  initPushService,
  sendWinbackNotifications,
  isPushServiceConfigured,
} from "../pushService";
import {
  getShippingRates,
  getTrackingSummary,
  getTrackingDetails,
  findPostOffices,
  validatePostalCode,
  getOriginPostal,
  isCanadaPostConfigured,
  pollCanadaPostTracking,
} from "../canadaPostService";
import { triggerOrderStatusUpdate } from "../emailTemplateEngine";

async function startServer() {
  // Initialize database (PostgreSQL if DATABASE_URL is set, otherwise in-memory)
  await initializeDatabase();

  // Initialize PWA push notification service (requires VAPID env vars)
  initPushService();

  const app = express();
  const server = createServer(app);

  // Add security headers
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
  );

  // Trust the first proxy hop (Railway, Cloudflare, etc.)
  // This makes req.ip use the real client IP from X-Forwarded-For
  // instead of always returning the proxy/load-balancer IP
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint (useful for Railway, monitoring, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: USE_PERSISTENT_DB ? "postgresql" : "in-memory",
      gmail: getGmailStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── STEALTH HEADERS: prevent search engines from indexing admin / API routes ───
  app.use((req, res, next) => {
    if (req.path.startsWith("/admin") || req.path.startsWith("/api/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
    }
    next();
  });

  // ─── ROBOTS.TXT ───
  app.get("/robots.txt", (_req, res) => {
    const SITE =
      process.env.SITE_URL ||
      "https://mylegacycannabisca-production.up.railway.app";
    res
      .type("text/plain")
      .send(
        `User-agent: *\n` +
          `Allow: /\n` +
          `Disallow: /admin\n` +
          `Disallow: /admin/*\n` +
          `Disallow: /api/\n` +
          `Disallow: /cart\n` +
          `Disallow: /checkout\n` +
          `Disallow: /account\n` +
          `Disallow: /account/*\n` +
          `Disallow: /verify-id\n` +
          `Disallow: /verify-mobile\n` +
          `Disallow: /login\n` +
          `Disallow: /register\n` +
          `Disallow: /complete-profile\n\n` +
          `# Sitemap\n` +
          `Sitemap: ${SITE}/sitemap.xml\n`
      );
  });

  // ─── XML SITEMAP ───
  app.get("/sitemap.xml", async (_req, res) => {
    const SITE =
      process.env.SITE_URL ||
      "https://mylegacycannabisca-production.up.railway.app";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Static pages with priority and changefreq
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/shop", priority: "0.9", changefreq: "daily" },
      { loc: "/rewards", priority: "0.7", changefreq: "monthly" },
      { loc: "/locations", priority: "0.8", changefreq: "monthly" },
      { loc: "/about", priority: "0.6", changefreq: "monthly" },
      { loc: "/shipping", priority: "0.5", changefreq: "monthly" },
      { loc: "/contact", priority: "0.6", changefreq: "monthly" },
      { loc: "/faq", priority: "0.6", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    ];

    // Category pages
    const categories = [
      "flower",
      "pre-rolls",
      "edibles",
      "vapes",
      "concentrates",
      "ounce-deals",
      "shake-n-bake",
      "accessories",
    ];

    let urls = staticPages.map(
      p =>
        `  <url>\n    <loc>${SITE}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    // Add category pages
    for (const cat of categories) {
      urls.push(
        `  <url>\n    <loc>${SITE}/shop/${cat}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    // Try to add product pages dynamically from DB
    try {
      const dbModule = await import("../db");
      const siteKnowledge = await dbModule.getSiteKnowledge("product_links");
      if (siteKnowledge) {
        const products = JSON.parse(siteKnowledge) as {
          name: string;
          url: string;
          category: string;
        }[];
        for (const p of products) {
          const slug = p.url.replace("/product/", "");
          urls.push(
            `  <url>\n    <loc>${SITE}/product/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
          );
        }
      }
    } catch {
      // Products not available from DB — skip dynamic product URLs
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    res.type("application/xml").send(xml);
  });

  // ─── GEO-LOCATION ENDPOINT (for auto-translation) ───
  // Returns the user's province/region from their IP via free ipapi.co service.
  // Quebec customers get French; everyone else gets English.
  app.get("/api/geo", async (req, res) => {
    try {
      // Get client IP — req.ip is trusted because we set "trust proxy" above
      // Express parses X-Forwarded-For safely, taking only the first untrusted hop
      const rawIp = req.ip || req.socket.remoteAddress || "";
      // Strip IPv4-mapped IPv6 prefix (::ffff:99.228.100.1 → 99.228.100.1)
      const ip = rawIp.startsWith("::ffff:") ? rawIp.substring(7) : rawIp;

      // Skip for localhost/private IPs
      if (
        !ip ||
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.")
      ) {
        return res.json({
          province: "",
          region: "",
          country: "CA",
          source: "local",
        });
      }

      // SECURITY: Validate IP format to prevent SSRF via crafted X-Forwarded-For
      // Only allow valid IPv4 (1.2.3.4) or IPv6 (::ffff:1.2.3.4, 2001:db8::1) addresses
      const IPV4_REGEX =
        /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
      const IPV6_REGEX = /^[0-9a-fA-F:.]+$/; // dot needed for IPv4-mapped IPv6
      if (!IPV4_REGEX.test(ip) && !IPV6_REGEX.test(ip)) {
        return res.json({
          province: "",
          region: "",
          country: "",
          source: "invalid",
        });
      }

      // Use free ipapi.co (no key required, 30k/month free)
      // IP is validated above — safe to interpolate into URL
      const geoUrl = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const geoRes = await fetch(geoUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (!geoRes.ok) throw new Error(`ipapi returned ${geoRes.status}`);
      const geo = (await geoRes.json()) as any;

      res.json({
        province: geo.region_code || geo.region || "",
        region: geo.region || "",
        country: geo.country_code || "",
        city: geo.city || "",
        source: "ipapi",
      });
    } catch (err) {
      // Fail silently — frontend will use browser language or default to English
      res.json({ province: "", region: "", country: "", source: "error" });
    }
  });

  // ─── NEAREST STORE ENDPOINT (uses geo to find closest location) ───
  app.get("/api/geo/nearest-store", async (req, res) => {
    try {
      const ip = getClientIP(req);
      const geo = await lookupGeo(ip);
      if (!geo || !geo.city || geo.countryCode !== "CA") {
        return res.json({
          store: null,
          geo: null,
          source: geo ? "non-ca" : "no-geo",
        });
      }
      const store = await getNearestStore(geo.city, geo.provinceCode || "ON");
      res.json({
        store: store
          ? {
              name: store.name,
              address: store.address,
              city: store.city,
              province: store.province,
              phone: store.phone,
              hours: store.hours,
              directionsUrl: store.directionsUrl,
            }
          : null,
        geo: {
          city: geo.city,
          province: geo.province,
          provinceCode: geo.provinceCode,
        },
        source: "ipapi",
      });
    } catch {
      res.json({ store: null, geo: null, source: "error" });
    }
  });
  // ─── DEBUG: Geo-check endpoint (temporary, for deployment validation) ───
  app.get("/api/debug/geo-check", async (req, res) => {
    try {
      const rawIp = req.ip || req.socket.remoteAddress || "";
      const clientIp = getClientIP(req);
      const isIPv4Mapped = rawIp.startsWith("::ffff:");
      const geo = await lookupGeo(clientIp);
      const cacheStats = getGeoCacheStats();

      res.json({
        timestamp: new Date().toISOString(),
        rawIp,
        isIPv4Mapped,
        normalizedIp: clientIp,
        ipHash: clientIp ? hashIP(clientIp) : null,
        geo: geo
          ? {
              city: geo.city,
              province: geo.province,
              provinceCode: geo.provinceCode,
              countryCode: geo.countryCode,
              isProxy: geo.isProxy,
            }
          : null,
        geoLookupSuccess: !!geo,
        cacheStats,
        headers: {
          "x-forwarded-for": req.headers["x-forwarded-for"] || null,
          "x-real-ip": req.headers["x-real-ip"] || null,
          "cf-connecting-ip": req.headers["cf-connecting-ip"] || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Custom auth routes (OTP, Google, profile completion)
  registerCustomAuthRoutes(app);
  // ID Verification REST API (guest + QR bridge + admin review)
  registerVerifyRoutes(app);

  // ─── CANADA POST SHIPPING API ───
  // POST /api/shipping/rates — get real-time rates (or fallback flat rates)
  app.post("/api/shipping/rates", async (req, res) => {
    try {
      const { postalCode, weight, dimensions, storeId } = req.body;
      if (!postalCode)
        return res.status(400).json({ error: "postalCode is required" });

      const validation = validatePostalCode(postalCode);
      if (!validation.valid)
        return res.status(400).json({ error: validation.error });

      const origin = getOriginPostal(storeId);
      const rates = await getShippingRates(
        origin,
        postalCode,
        weight || 0.5,
        dimensions
      );
      res.json({ rates, origin, configured: isCanadaPostConfigured() });
    } catch (err) {
      console.error("[Shipping] Rate error:", (err as Error).message);
      res.status(500).json({ error: "Failed to get shipping rates" });
    }
  });

  // GET /api/shipping/track/:pin — summary tracking
  app.get("/api/shipping/track/:pin", async (req, res) => {
    try {
      const summary = await getTrackingSummary(req.params.pin);
      if (!summary)
        return res.status(404).json({ error: "Tracking info not found" });
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Tracking lookup failed" });
    }
  });

  // GET /api/shipping/track/:pin/details — full event history
  app.get("/api/shipping/track/:pin/details", async (req, res) => {
    try {
      const details = await getTrackingDetails(req.params.pin);
      if (!details)
        return res.status(404).json({ error: "Tracking details not found" });
      res.json(details);
    } catch (err) {
      res.status(500).json({ error: "Tracking details lookup failed" });
    }
  });

  // GET /api/shipping/post-offices?postalCode=...&max=5
  app.get("/api/shipping/post-offices", async (req, res) => {
    try {
      const postalCode = req.query.postalCode as string;
      if (!postalCode)
        return res
          .status(400)
          .json({ error: "postalCode query param is required" });
      const max = parseInt(req.query.max as string) || 5;
      const offices = await findPostOffices(postalCode, max);
      res.json(offices);
    } catch (err) {
      res.status(500).json({ error: "Post office search failed" });
    }
  });

  // GET /api/shipping/validate-postal?code=...
  app.get("/api/shipping/validate-postal", (req, res) => {
    const code = req.query.code as string;
    if (!code)
      return res.status(400).json({ error: "code query param is required" });
    res.json(validatePostalCode(code));
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ─── MATERIALIZE UPLOADED FILES FROM DB ───
  // On container deploy, uploaded files (logo, product images, ID photos) are lost.
  // This step restores them from the database's file_store table to disk before
  // the static file server starts, ensuring all /uploads/* URLs work immediately.
  if (USE_PERSISTENT_DB) {
    try {
      const distPublicForUploads = fs.existsSync(
        path.resolve(import.meta.dirname, "public")
      )
        ? path.resolve(import.meta.dirname, "public")
        : path.resolve(process.cwd(), "dist", "public");
      const uploadsDir = path.join(distPublicForUploads, "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });

      const files = await fileStoreGetAll();
      let restored = 0;
      for (const file of files) {
        try {
          const fileName = file.key.replace(/^uploads\//, "");
          const filePath = path.join(uploadsDir, fileName);
          // Only write if the file doesn't exist or is a different size
          const exists = fs.existsSync(filePath);
          if (
            !exists ||
            (file.sizeBytes && fs.statSync(filePath).size !== file.sizeBytes)
          ) {
            fs.writeFileSync(filePath, Buffer.from(file.data, "base64"));
            restored++;
          }
        } catch (fileErr) {
          console.warn(
            `[FileStore] Failed to restore ${file.key}:`,
            (fileErr as Error).message
          );
        }
      }
      if (files.length > 0) {
        console.log(
          `[FileStore] Materialized ${restored} of ${files.length} files from DB to disk`
        );
      }

      // ── BACKFILL: persist existing disk files to DB (first deploy after this feature) ──
      // If the uploads dir has files not yet in the DB, persist them so next deploy is safe.
      const diskFiles = fs.existsSync(uploadsDir)
        ? fs.readdirSync(uploadsDir)
        : [];
      const dbKeys = new Set(files.map(f => f.key));
      let backfilled = 0;
      const MIME_MAP: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".gif": "image/gif",
        ".avif": "image/avif",
        ".ico": "image/x-icon",
      };
      for (const diskFile of diskFiles) {
        const key = `uploads/${diskFile}`;
        if (!dbKeys.has(key)) {
          try {
            const ext = path.extname(diskFile).toLowerCase();
            const ct = MIME_MAP[ext] || "application/octet-stream";
            const buf = fs.readFileSync(path.join(uploadsDir, diskFile));
            await fileStorePut(key, buf, ct);
            backfilled++;
          } catch (bfErr) {
            console.warn(
              `[FileStore] Backfill failed for ${diskFile}:`,
              (bfErr as Error).message
            );
          }
        }
      }
      if (backfilled > 0) {
        console.log(
          `[FileStore] Backfilled ${backfilled} existing disk files to DB`
        );
      }
    } catch (err) {
      console.warn(
        "[FileStore] Failed to materialize files:",
        (err as Error).message
      );
    }
  }

  // Use static serving if the dist/public directory exists (production build available),
  // otherwise fall back to Vite dev server. This allows NODE_ENV=development in .env
  // while still serving the production build in sandbox/Railway.
  const distPublicPath = path.resolve(import.meta.dirname, "public");
  const distPublicPathAlt = path.resolve(process.cwd(), "dist", "public");
  const hasBuild =
    fs.existsSync(distPublicPath) || fs.existsSync(distPublicPathAlt);
  if (!hasBuild && process.env.NODE_ENV === "development") {
    // Dynamic import: vite.ts pulls in "vite" (a devDependency) which
    // doesn't exist in the production Docker image. Importing it lazily
    // ensures the production server never tries to load it.
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Railway (and most PaaS platforms) assign a PORT env var and expect the server
  // to bind EXACTLY to that port on 0.0.0.0. Port-scanning to a fallback causes
  // Railway to return 502 because traffic is routed only to the assigned PORT.
  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });

  // ─── GRACEFUL SHUTDOWN (fixes EADDRINUSE on tsx watch restarts) ───
  const shutdown = () => {
    server.close(() => process.exit(0));
    // Force exit after 3s if connections linger
    setTimeout(() => process.exit(0), 3000);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // ─── BACKGROUND JOBS ───
  // Run auto-cancel for unpaid orders every hour
  setInterval(
    async () => {
      try {
        const count = await autoCancelUnpaidOrders();
        if (count > 0)
          console.log(`[Cron] Auto-cancelled ${count} unpaid order(s)`);
      } catch (err) {
        console.error("[Cron] Auto-cancel error:", err);
      }
    },
    60 * 60 * 1000
  ); // every hour

  // Run birthday bonus check every 6 hours
  setInterval(
    async () => {
      try {
        const awarded = await checkBirthdayBonuses();
        if (awarded > 0)
          console.log(`[Cron] Awarded birthday bonus to ${awarded} user(s)`);
      } catch (err) {
        console.error("[Cron] Birthday bonus error:", err);
      }
    },
    6 * 60 * 60 * 1000
  ); // every 6 hours

  // Poll Gmail for e-Transfer deposit notifications every 5 minutes
  const ETRANSFER_POLL_INTERVAL = parseInt(
    process.env.ETRANSFER_POLL_INTERVAL || "300000",
    10
  );
  if (isETransferServiceConfigured()) {
    console.log(
      `[ETransfer] Service configured — polling every ${ETRANSFER_POLL_INTERVAL / 1000}s`
    );
    setInterval(async () => {
      try {
        await pollETransferEmails();
      } catch (err) {
        // OAuth errors are already handled cleanly inside pollETransferEmails;
        // only unexpected errors bubble here.
        const msg = (err as any)?.message || err;
        console.error(`[Cron] E-Transfer poll error: ${msg}`);
      }
    }, ETRANSFER_POLL_INTERVAL);
  } else {
    console.log(
      "[ETransfer] Gmail API not configured — e-Transfer auto-matching disabled"
    );
  }

  // Poll Gmail for delivery/tracking notifications every 10 minutes
  const TRACKING_POLL_INTERVAL = parseInt(
    process.env.TRACKING_POLL_INTERVAL || "600000",
    10
  );
  if (isTrackingServiceConfigured()) {
    console.log(
      `[Tracking] Service configured — polling every ${TRACKING_POLL_INTERVAL / 1000}s`
    );
    setInterval(async () => {
      try {
        await pollTrackingEmails();
      } catch (err) {
        const msg = (err as any)?.message || err;
        console.error(`[Cron] Tracking poll error: ${msg}`);
      }
    }, TRACKING_POLL_INTERVAL);
  }

  // Poll Canada Post tracking API for shipped orders every 15 minutes
  const CP_TRACKING_POLL = parseInt(
    process.env.CP_TRACKING_POLL_INTERVAL || "900000",
    10
  );
  if (isCanadaPostConfigured()) {
    console.log(
      `[CanadaPost] Tracking poll configured — every ${CP_TRACKING_POLL / 1000}s`
    );
    setInterval(async () => {
      try {
        const shippedOrders = await getAllOrders({
          status: "shipped",
          limit: 200,
        });
        const ordersWithTracking = shippedOrders.data
          .filter(o => o.trackingNumber)
          .map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            trackingNumber: o.trackingNumber,
          }));

        if (ordersWithTracking.length === 0) return;

        const stats = await pollCanadaPostTracking(
          ordersWithTracking,
          async (orderId, data) => {
            if (data.delivered) {
              await updateOrder(orderId, { status: "delivered" } as any);
              const order = await getOrderById(orderId);

              // Award reward points
              const pointsResult = await awardOrderPoints(orderId);
              if (pointsResult) {
                console.log(
                  `[CanadaPost] Awarded ${pointsResult.points} points for delivered order #${order?.orderNumber}`
                );
              }

              // Send delivery email
              if (order?.guestEmail) {
                triggerOrderStatusUpdate({
                  customerName: order.guestName || "Customer",
                  customerEmail: order.guestEmail,
                  orderId: order.orderNumber || String(orderId),
                  orderStatus: "Delivered",
                  statusMessage:
                    "Your order has been delivered! Thank you for shopping with MyLegacy Cannabis. We hope you enjoy your purchase.",
                }).catch(err =>
                  console.warn(
                    "[CanadaPost] Delivery email failed:",
                    err.message
                  )
                );
              }

              await logAdminActivity({
                adminId: 0,
                adminName: "System (Canada Post)",
                action: "auto_delivered",
                entityType: "order",
                entityId: orderId,
                details: `Auto-delivered via Canada Post tracking API (${order?.trackingNumber})`,
              });
            }
          }
        );

        if (stats.delivered > 0) {
          console.log(
            `[CanadaPost] Poll: ${stats.checked} checked, ${stats.delivered} auto-delivered, ${stats.errors} errors`
          );
        }
      } catch (err) {
        console.error(
          "[Cron] Canada Post tracking poll error:",
          (err as Error).message
        );
      }
    }, CP_TRACKING_POLL);
  }

  // Run all jobs immediately on startup (after a short delay to let DB settle)
  setTimeout(async () => {
    try {
      const cancelCount = await autoCancelUnpaidOrders();
      if (cancelCount > 0)
        console.log(`[Startup] Auto-cancelled ${cancelCount} unpaid order(s)`);
      const birthdayCount = await checkBirthdayBonuses();
      if (birthdayCount > 0)
        console.log(
          `[Startup] Awarded birthday bonus to ${birthdayCount} user(s)`
        );
      // Initial e-Transfer poll
      if (isETransferServiceConfigured()) {
        const etStats = await pollETransferEmails();
        console.log(
          `[Startup] E-Transfer poll: ${etStats.processed} processed, ${etStats.matched} matched`
        );
      }
      // Initial tracking delivery poll
      if (isTrackingServiceConfigured()) {
        const trackStats = await pollTrackingEmails();
        if (trackStats.deliveredOrders > 0) {
          console.log(
            `[Startup] Tracking poll: ${trackStats.deliveredOrders} orders auto-delivered`
          );
        }
      }
      // Initial Canada Post API tracking poll
      if (isCanadaPostConfigured()) {
        const shippedOrders = await getAllOrders({
          status: "shipped",
          limit: 200,
        });
        const ordersWithTracking = shippedOrders.data
          .filter(o => o.trackingNumber)
          .map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            trackingNumber: o.trackingNumber,
          }));
        if (ordersWithTracking.length > 0) {
          const cpStats = await pollCanadaPostTracking(
            ordersWithTracking,
            async (orderId, data) => {
              if (data.delivered) {
                await updateOrder(orderId, { status: "delivered" } as any);
                const order = await getOrderById(orderId);
                await awardOrderPoints(orderId);
                if (order?.guestEmail) {
                  triggerOrderStatusUpdate({
                    customerName: order.guestName || "Customer",
                    customerEmail: order.guestEmail,
                    orderId: order.orderNumber || String(orderId),
                    orderStatus: "Delivered",
                    statusMessage:
                      "Your order has been delivered! Thank you for shopping with MyLegacy Cannabis.",
                  }).catch(() => {});
                }
                await logAdminActivity({
                  adminId: 0,
                  adminName: "System (Canada Post)",
                  action: "auto_delivered",
                  entityType: "order",
                  entityId: orderId,
                  details: `Auto-delivered via Canada Post tracking API (${order?.trackingNumber})`,
                });
              }
            }
          );
          if (cpStats.delivered > 0) {
            console.log(
              `[Startup] Canada Post poll: ${cpStats.delivered} orders auto-delivered`
            );
          }
        }
      }
    } catch (err) {
      const msg = (err as any)?.message || err;
      console.error(`[Startup] Background job error: ${msg}`);
    }
  }, 5000);

  // ─── AI MEMORY & KNOWLEDGE SYNC BACKGROUND JOBS ───
  // Refresh AI user memories every 30 minutes (processes behavior events into profiles)
  if (USE_PERSISTENT_DB) {
    setInterval(
      async () => {
        try {
          const result = await refreshAllAiUserMemories();
          if (result.refreshed > 0)
            console.log(
              `[Cron] AI memory refresh: ${result.refreshed} user(s) updated`
            );
        } catch (err) {
          console.error("[Cron] AI memory refresh error:", err);
        }
      },
      30 * 60 * 1000
    ); // every 30 minutes

    // Run push win-back campaign daily (sends to subscribers inactive 30+ days)
    if (isPushServiceConfigured()) {
      setInterval(
        async () => {
          try {
            const sent = await sendWinbackNotifications();
            if (sent > 0)
              console.log(
                `[Cron] Push win-back: sent to ${sent} inactive subscriber(s)`
              );
          } catch (err) {
            console.error(
              "[Cron] Push win-back error:",
              (err as Error).message
            );
          }
        },
        24 * 60 * 60 * 1000
      ); // every 24 hours
    }

    // Re-sync site knowledge every 2 hours (catches any drift)
    setInterval(
      async () => {
        try {
          await syncAllSiteKnowledge();
          console.log("[Cron] Site knowledge re-synced");
        } catch (err) {
          console.error("[Cron] Knowledge sync error:", err);
        }
      },
      2 * 60 * 60 * 1000
    ); // every 2 hours

    // ─── SEO METRICS COLLECTION ───
    // Collect Google Search Console data every 6 hours (GSC data has 48-72h delay,
    // so hourly polling is unnecessary; 6h ensures we catch daily updates).
    setInterval(
      async () => {
        try {
          const { collectSeoMetrics, isGscConfigured } = await import(
            "../searchConsoleService"
          );
          if (!isGscConfigured()) return;
          const result = await collectSeoMetrics();
          if (result.collected) {
            console.log(
              `[Cron] SEO metrics collected, ${result.alertsGenerated} alert(s) generated`
            );
          }
        } catch (err) {
          console.error(
            "[Cron] SEO metrics collection error:",
            (err as Error).message
          );
        }
      },
      6 * 60 * 60 * 1000
    ); // every 6 hours

    // Run initial order back-fill and AI memory refresh 15s after startup
    setTimeout(async () => {
      try {
        const linked = await backfillOrderUserIds();
        if (linked > 0)
          console.log(`[Startup] Back-filled ${linked} order(s) with user IDs`);
      } catch (err) {
        console.error("[Startup] Order back-fill error:", err);
      }
      try {
        const result = await refreshAllAiUserMemories();
        if (result.refreshed > 0)
          console.log(
            `[Startup] AI memory refresh: ${result.refreshed} user(s) updated`
          );
      } catch (err) {
        console.error("[Startup] AI memory refresh error:", err);
      }
    }, 15000);
  }
}

startServer().catch(console.error);
