import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectSeoMeta } from "./seo-middleware";

export function serveStatic(app: Express) {
  // Prefer dist/public (sibling of this built file) if it exists,
  // then fall back to ../../dist/public for dev layouts.
  const distPathProd = path.resolve(import.meta.dirname, "public");
  const distPathDev = path.resolve(
    import.meta.dirname,
    "../..",
    "dist",
    "public"
  );
  const distPath = fs.existsSync(distPathProd) ? distPathProd : distPathDev;
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Read and cache the index.html template (re-read on 404 fallback for dev convenience)
  const indexHtmlPath = path.resolve(distPath, "index.html");
  let indexHtmlCache: string | null = null;
  function getIndexHtml(): string {
    if (!indexHtmlCache) {
      indexHtmlCache = fs.readFileSync(indexHtmlPath, "utf-8");
    }
    return indexHtmlCache;
  }

  // Static asset caching strategy:
  //   - Hashed JS/CSS (assets/): immutable, 1 year
  //   - Images (webp/png/jpg/svg/ico): 1 week (content-addressed via upload path)
  //   - uploads/: 1 week (user-uploaded logos etc.)
  //   - Everything else (HTML, etc.): no-cache
  // Serve index.html for root "/" via our SEO handler, not express.static
  app.use(
    express.static(distPath, {
      index: false, // Don't auto-serve index.html for "/"
      setHeaders(res, filePath) {
        const base = path.basename(filePath);
        if (
          filePath.includes("/assets/") &&
          /[-][A-Za-z0-9_-]{6,}\.\w+$/.test(base)
        ) {
          // Hashed asset (e.g. index-BGLpvbiN.js) — immutable
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (/\.(webp|png|jpe?g|svg|ico|avif|gif)$/i.test(base)) {
          // Image files — cache 1 week (logo.webp, logo.png, favicons, etc.)
          res.setHeader(
            "Cache-Control",
            "public, max-age=604800, stale-while-revalidate=86400"
          );
        } else if (filePath.includes("/uploads/")) {
          // User uploads (admin logo uploads) — cache 1 week
          res.setHeader(
            "Cache-Control",
            "public, max-age=604800, stale-while-revalidate=86400"
          );
        } else {
          // Non-hashed asset or HTML — never cache
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  // SPA fallback: inject per-route SEO metadata into index.html
  app.use("*", async (req, res) => {
    // HTML must never be cached so browsers always get the latest hashed asset references
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const requestPath = req.originalUrl.split("?")[0];
    const html = await injectSeoMeta(getIndexHtml(), requestPath);
    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  });
}
