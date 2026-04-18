// Storage helpers for file upload/download via configured storage proxy
// Uses Bearer token authentication. Set STORAGE_API_URL and STORAGE_API_KEY in .env to enable.
// When not configured, files are saved to the local dist/public/uploads/ directory
// and served via Express static middleware.
// IMPORTANT: All local uploads are also persisted to the database (file_store table)
// so they survive container deploys on Railway / Docker.

import { ENV } from './_core/env';
import fs from 'fs';
import path from 'path';
import * as db from './db';

// ─── Image optimization constants ──────────────────────────────────────────────
// Responsive breakpoints for product images
const IMAGE_SIZES = {
  thumb:  { width: 200, suffix: '-thumb' },   // product list thumbnails
  card:   { width: 400, suffix: '-card' },     // shop grid cards
  full:   { width: 1200, suffix: '' },         // product detail page (original name)
} as const;
const WEBP_QUALITY = 82;
const IS_IMAGE_RE = /\.(png|jpe?g|webp|avif|gif|heic|heif|tiff?)$/i;
const IS_BRANDING_RE = /^branding\//;

type StorageConfig = { baseUrl: string; apiKey: string } | null;

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── Image optimisation helper ─────────────────────────────────────────────────
// Converts any uploaded image to WebP at multiple responsive sizes.
// Returns an object with the URLs of each size, or null if the file is not an
// image or sharp is unavailable.
export interface OptimizedImages {
  /** Full-size WebP (max 1200 px wide) — used as the canonical product image */
  url: string;
  /** Thumbnail (200 px) */
  thumb: string;
  /** Card size (400 px) */
  card: string;
  /** Original file kept as-is */
  original: string;
}

async function optimizeImage(
  buf: Buffer,
  baseName: string,
  uploadsDir: string,
  clientUploadsDir: string | null,
): Promise<OptimizedImages | null> {
  try {
    const sharp = await import("sharp").then(m => m.default);
    const stem = baseName.replace(/\.[^.]+$/, ""); // e.g. "abc123"
    const results: OptimizedImages = { url: "", thumb: "", card: "", original: "" };

    for (const [key, { width, suffix }] of Object.entries(IMAGE_SIZES)) {
      const webpName = `${stem}${suffix}.webp`;
      const webpBuf = await sharp(buf)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      fs.writeFileSync(path.join(uploadsDir, webpName), webpBuf);
      if (clientUploadsDir) {
        fs.writeFileSync(path.join(clientUploadsDir, webpName), webpBuf);
      }
      // Persist optimized variant to DB
      db.fileStorePut(`uploads/${webpName}`, webpBuf, 'image/webp').catch(err =>
        console.warn(`[Storage] DB persist failed for uploads/${webpName}:`, err.message)
      );
      const publicUrl = `/uploads/${webpName}`;
      if (key === "full")  results.url   = publicUrl;
      if (key === "thumb") results.thumb = publicUrl;
      if (key === "card")  results.card  = publicUrl;
      console.log(`[Storage] WebP ${key}: /uploads/${webpName} (${(webpBuf.length / 1024).toFixed(1)} KB)`);
    }
    return results;
  } catch {
    console.log("[Storage] sharp not available — skipping image optimisation");
    return null;
  }
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string; optimized?: OptimizedImages }> {
  const config = getStorageConfig();
  if (!config) {
    // No storage backend — save file to dist/public/uploads/ and serve
    // via Express static middleware. This avoids oversized data URLs in the DB.
    const key = normalizeKey(relKey);
    const buf = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data as any);

    // Resolve the dist/public directory — check multiple possible locations:
    //   1. <cwd>/dist/public  (dev mode with vite build output)
    //   2. <script_dir>/_core/public (production bundled)
    const projectRoot = process.cwd();
    const candidates = [
      path.resolve(projectRoot, "dist", "public"),
      ...(import.meta.dirname ? [
        path.resolve(import.meta.dirname, "_core", "public"),
        path.resolve(import.meta.dirname, "..", "dist", "public"),
      ] : []),
    ];
    const distPath = candidates.find(p => fs.existsSync(p)) || candidates[0];
    const uploadsDir = path.join(distPath, "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Use the relKey filename (e.g. "branding/site-logo.png" → "site-logo.png")
    const fileName = path.basename(key);
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buf);

    // ── Persist to database so file survives container deploys ──
    db.fileStorePut(`uploads/${fileName}`, buf, contentType).catch(err =>
      console.warn(`[Storage] DB persist failed for uploads/${fileName}:`, err.message)
    );

    // Also write to client/public/uploads/ so Vite dev server serves it too
    const clientPublicDir = path.resolve(projectRoot, "client", "public");
    let clientUploadsDir: string | null = null;
    if (fs.existsSync(clientPublicDir)) {
      clientUploadsDir = path.join(clientPublicDir, "uploads");
      fs.mkdirSync(clientUploadsDir, { recursive: true });
      fs.writeFileSync(path.join(clientUploadsDir, fileName), buf);
    }

    // ── Auto-optimise uploaded images to WebP ──────────────────────────────
    // For branding uploads (logos): single WebP at 512 px wide
    // For product / general images: responsive WebP set (thumb, card, full)
    const publicUrl = `/uploads/${fileName}`;
    let optimized: OptimizedImages | undefined;

    if (IS_IMAGE_RE.test(fileName)) {
      if (IS_BRANDING_RE.test(key)) {
        // Branding logo — single size
        try {
          const sharp = await import("sharp").then(m => m.default);
          const webpName = fileName.replace(/\.[^.]+$/, ".webp");
          const webpBuf = await sharp(buf).resize({ width: 512, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
          fs.writeFileSync(path.join(uploadsDir, webpName), webpBuf);
          if (clientUploadsDir) fs.writeFileSync(path.join(clientUploadsDir, webpName), webpBuf);
          // Persist WebP variant to DB
          db.fileStorePut(`uploads/${webpName}`, webpBuf, 'image/webp').catch(err =>
            console.warn(`[Storage] DB persist failed for uploads/${webpName}:`, err.message)
          );
          console.log(`[Storage] Auto-generated WebP: /uploads/${webpName} (${(webpBuf.length / 1024).toFixed(1)} KB)`);
        } catch {
          console.log("[Storage] sharp not available — skipping WebP auto-generation");
        }
      } else {
        // Product / general image — responsive set
        const result = await optimizeImage(buf, fileName, uploadsDir, clientUploadsDir);
        if (result) {
          result.original = publicUrl;
          optimized = result;
        }
      }
    }

    return { key, url: optimized?.url || publicUrl, optimized };
  }
  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  if (!config) {
    const key = normalizeKey(relKey);
    return { key, url: `https://placehold.co/400x400?text=Image+Unavailable` };
  }
  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
