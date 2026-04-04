import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Prefer dist/public (sibling of this built file) if it exists,
  // then fall back to ../../dist/public for dev layouts.
  const distPathProd = path.resolve(import.meta.dirname, "public");
  const distPathDev  = path.resolve(import.meta.dirname, "../..", "dist", "public");
  const distPath = fs.existsSync(distPathProd) ? distPathProd : distPathDev;
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Static asset caching strategy:
  //   - Hashed JS/CSS (assets/): immutable, 1 year
  //   - Images (webp/png/jpg/svg/ico): 1 week (content-addressed via upload path)
  //   - uploads/: 1 week (user-uploaded logos etc.)
  //   - Everything else (HTML, etc.): no-cache
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (filePath.includes('/assets/') && /[-][A-Za-z0-9_-]{6,}\.\w+$/.test(base)) {
        // Hashed asset (e.g. index-BGLpvbiN.js) — immutable
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(webp|png|jpe?g|svg|ico|avif|gif)$/i.test(base)) {
        // Image files — cache 1 week (logo.webp, logo.png, favicons, etc.)
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      } else if (filePath.includes('/uploads/')) {
        // User uploads (admin logo uploads) — cache 1 week
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      } else {
        // Non-hashed asset or HTML — never cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // HTML must never be cached so browsers always get the latest hashed asset references
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
