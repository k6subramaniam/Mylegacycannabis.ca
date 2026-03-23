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

  // Hashed JS/CSS assets get long-lived cache; everything else gets no-cache
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (filePath.includes('/assets/') && /[-][A-Za-z0-9_-]{6,}\.\w+$/.test(path.basename(filePath))) {
        // Hashed asset (e.g. index-BGLpvbiN.js) — immutable
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
