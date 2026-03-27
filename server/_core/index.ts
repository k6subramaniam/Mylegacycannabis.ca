import "dotenv/config";
import dns from "dns";
// Railway blocks outbound IPv6 SMTP (QDISC_DROP). Force IPv4 for all DNS lookups
// so nodemailer and any other net connections resolve to IPv4 addresses.
dns.setDefaultResultOrder("ipv4first");
import express from "express";
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
import { initializeDatabase, USE_PERSISTENT_DB, autoCancelUnpaidOrders, checkBirthdayBonuses } from "../db";

async function startServer() {
  // Initialize database (PostgreSQL if DATABASE_URL is set, otherwise in-memory)
  await initializeDatabase();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint (useful for Railway, monitoring, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: USE_PERSISTENT_DB ? "postgresql" : "in-memory",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── ROBOTS.TXT ───
  app.get("/robots.txt", (_req, res) => {
    const SITE = "https://mylegacycannabisca-production.up.railway.app";
    res.type("text/plain").send(
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
    const SITE = "https://mylegacycannabisca-production.up.railway.app";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Static pages with priority and changefreq
    const staticPages = [
      { loc: "/",              priority: "1.0", changefreq: "daily"   },
      { loc: "/shop",          priority: "0.9", changefreq: "daily"   },
      { loc: "/rewards",       priority: "0.7", changefreq: "monthly" },
      { loc: "/locations",     priority: "0.8", changefreq: "monthly" },
      { loc: "/about",         priority: "0.6", changefreq: "monthly" },
      { loc: "/shipping",      priority: "0.5", changefreq: "monthly" },
      { loc: "/contact",       priority: "0.6", changefreq: "monthly" },
      { loc: "/faq",           priority: "0.6", changefreq: "monthly" },
      { loc: "/privacy-policy",priority: "0.3", changefreq: "yearly"  },
      { loc: "/terms",         priority: "0.3", changefreq: "yearly"  },
    ];

    // Category pages
    const categories = [
      "flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories",
    ];

    let urls = staticPages.map(p =>
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
      const { db } = await import("../db");
      const products = db.prepare?.("SELECT slug, updated_at FROM products WHERE active = 1 ORDER BY updated_at DESC")?.all?.() as any[];
      if (products && products.length > 0) {
        for (const p of products) {
          const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : today;
          urls.push(
            `  <url>\n    <loc>${SITE}/product/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
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
      // Get client IP (behind proxy: x-forwarded-for, or Railway sets x-real-ip)
      const forwarded = req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.socket.remoteAddress || "";

      // Skip for localhost/private IPs
      if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return res.json({ province: "", region: "", country: "CA", source: "local" });
      }

      // Use free ipapi.co (no key required, 30k/month free)
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!geoRes.ok) throw new Error(`ipapi returned ${geoRes.status}`);
      const geo = await geoRes.json() as any;

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
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Custom auth routes (OTP, Google, profile completion)
  registerCustomAuthRoutes(app);
  // ID Verification REST API (guest + QR bridge + admin review)
  registerVerifyRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Use static serving if the dist/public directory exists (production build available),
  // otherwise fall back to Vite dev server. This allows NODE_ENV=development in .env
  // while still serving the production build in sandbox/Railway.
  const distPublicPath = path.resolve(import.meta.dirname, "public");
  const hasBuild = fs.existsSync(distPublicPath);
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
  setInterval(async () => {
    try {
      const count = await autoCancelUnpaidOrders();
      if (count > 0) console.log(`[Cron] Auto-cancelled ${count} unpaid order(s)`);
    } catch (err) {
      console.error("[Cron] Auto-cancel error:", err);
    }
  }, 60 * 60 * 1000); // every hour

  // Run birthday bonus check every 6 hours
  setInterval(async () => {
    try {
      const awarded = await checkBirthdayBonuses();
      if (awarded > 0) console.log(`[Cron] Awarded birthday bonus to ${awarded} user(s)`);
    } catch (err) {
      console.error("[Cron] Birthday bonus error:", err);
    }
  }, 6 * 60 * 60 * 1000); // every 6 hours

  // Run both immediately on startup (after a short delay to let DB settle)
  setTimeout(async () => {
    try {
      const cancelCount = await autoCancelUnpaidOrders();
      if (cancelCount > 0) console.log(`[Startup] Auto-cancelled ${cancelCount} unpaid order(s)`);
      const birthdayCount = await checkBirthdayBonuses();
      if (birthdayCount > 0) console.log(`[Startup] Awarded birthday bonus to ${birthdayCount} user(s)`);
    } catch (err) {
      console.error("[Startup] Background job error:", err);
    }
  }, 5000);
}

startServer().catch(console.error);
