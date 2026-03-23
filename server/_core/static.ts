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

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
