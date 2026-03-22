import "dotenv/config";
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
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
}

startServer().catch(console.error);
