/**
 * Geolocation Service — PIPEDA-compliant IP geolocation for analytics.
 *
 * - Uses FreeIPAPI (https://freeipapi.com) — no API key required, 60 req/min free tier
 * - Never stores raw IP addresses; only SHA-256 hash (first 16 chars)
 * - Caches results in-memory (24h TTL, max 50k entries) to minimize API calls
 * - Respects DNT, GPC, and opt-out cookie
 * - Non-blocking: geo lookup failures never break the request
 */

import { createHash } from "crypto";

// ─── Types ───
export interface GeoResult {
  ipHash: string;         // SHA-256 first 16 chars (PIPEDA-safe)
  city: string;
  province: string;       // Full name, e.g. "Ontario"
  provinceCode: string;   // ISO-3166-2, e.g. "ON"
  countryCode: string;    // ISO-3166-1, e.g. "CA"
  isProxy: boolean;
}

// ─── In-memory cache ───
interface CacheEntry {
  geo: GeoResult;
  expiresAt: number;
}

const GEO_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50_000;

// ─── Helpers ───
export function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

const PRIVATE_IP_REGEX = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80)/;
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_REGEX = /^[0-9a-fA-F:.]+$/; // dot needed for IPv4-mapped IPv6 (::ffff:1.2.3.4)

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_REGEX.test(ip);
}

function isValidIP(ip: string): boolean {
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}

/**
 * Strip IPv4-mapped IPv6 prefix.
 * Railway/Express behind a reverse proxy surfaces IPs as ::ffff:99.228.100.1
 * FreeIPAPI expects plain IPv4, so strip the prefix.
 */
function normalizeIP(ip: string): string {
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}

// Canadian province code mapping
const PROVINCE_CODE_MAP: Record<string, string> = {
  "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB",
  "New Brunswick": "NB", "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT", "Nova Scotia": "NS", "Nunavut": "NU",
  "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
  "Saskatchewan": "SK", "Yukon": "YT",
};

// ─── Cache eviction ───
function evictExpired(): void {
  const now = Date.now();
  GEO_CACHE.forEach((entry, key) => {
    if (entry.expiresAt < now) GEO_CACHE.delete(key);
  });
  // If still over max, evict oldest entries
  if (GEO_CACHE.size > MAX_CACHE_SIZE) {
    const sorted = Array.from(GEO_CACHE.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = sorted.slice(0, GEO_CACHE.size - MAX_CACHE_SIZE + 1000);
    toDelete.forEach(([key]) => GEO_CACHE.delete(key));
  }
}

/**
 * Resolve geo data for an IP address.
 * Returns null for private/invalid IPs or on API failure.
 */
export async function lookupGeo(rawIp: string): Promise<GeoResult | null> {
  const ip = normalizeIP(rawIp || "");
  if (!ip || isPrivateIP(ip) || !isValidIP(ip)) return null;

  const ipH = hashIP(ip);

  // Check cache
  const cached = GEO_CACHE.get(ipH);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.geo;
  }

  try {
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const province = data.regionName || "";
    const provinceCode = data.regionCode || PROVINCE_CODE_MAP[province] || "";

    const geo: GeoResult = {
      ipHash: ipH,
      city: data.cityName || "",
      province,
      provinceCode,
      countryCode: data.countryCode || "",
      isProxy: data.isProxy === true,
    };

    // Cache it
    GEO_CACHE.set(ipH, { geo, expiresAt: Date.now() + CACHE_TTL_MS });
    if (GEO_CACHE.size > MAX_CACHE_SIZE) evictExpired();

    return geo;
  } catch {
    // API timeout or network failure — don't block
    return null;
  }
}

/**
 * Extract the real client IP from an Express request.
 * Requires `app.set("trust proxy", 1)` to be set.
 */
export function getClientIP(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  const raw = req.ip || req.socket?.remoteAddress || "";
  return normalizeIP(raw);
}

/**
 * Check if the user has opted out of analytics via DNT, GPC, or cookie.
 */
export function isOptedOut(req: any): boolean {
  // Do-Not-Track
  if (req.headers?.["dnt"] === "1") return true;
  // Global Privacy Control
  if (req.headers?.["sec-gpc"] === "1") return true;
  // Opt-out cookie
  const cookies = req.headers?.cookie || "";
  if (cookies.includes("mlc-analytics-optout=1")) return true;
  return false;
}

/** Get cache stats for monitoring */
export function getGeoCacheStats(): { size: number; maxSize: number } {
  return { size: GEO_CACHE.size, maxSize: MAX_CACHE_SIZE };
}
