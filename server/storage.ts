// Storage helpers for file upload/download via configured storage proxy
// Uses Bearer token authentication. Set STORAGE_API_URL and STORAGE_API_KEY in .env to enable.
// When not configured, files are saved to the local dist/public/uploads/ directory
// and served via Express static middleware.

import { ENV } from './_core/env';
import fs from 'fs';
import path from 'path';

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

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
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

    // Also write to client/public/uploads/ so Vite dev server serves it too
    const clientPublicDir = path.resolve(projectRoot, "client", "public");
    if (fs.existsSync(clientPublicDir)) {
      const clientUploadsDir = path.join(clientPublicDir, "uploads");
      fs.mkdirSync(clientUploadsDir, { recursive: true });
      fs.writeFileSync(path.join(clientUploadsDir, fileName), buf);
    }

    const publicUrl = `/uploads/${fileName}`;
    return { key, url: publicUrl };
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
