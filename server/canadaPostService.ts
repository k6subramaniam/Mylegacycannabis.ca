/**
 * Canada Post Integration Service
 *
 * Provides: rate lookup, shipment tracking, post-office search, postal code validation.
 *
 * Uses the Canada Post REST API (XML format, HTTP Basic Auth).
 * Falls back to flat-rate shipping when API credentials are not configured.
 *
 * Environment variables:
 *   CANADA_POST_API_USER          — API username (development or production)
 *   CANADA_POST_API_PASS          — API password
 *   CANADA_POST_CUSTOMER_NUMBER   — customer/mobo number
 *   CANADA_POST_CONTRACT_NUMBER   — (optional) contract id for negotiated rates
 *   CANADA_POST_BASE_URL          — base URL (default: sandbox)
 *   MLC_DEFAULT_ORIGIN_POSTAL     — fallback origin postal if store lookup fails
 */

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ShippingRate {
  serviceCode: string;
  serviceName: string;
  price: number;
  transitDays: number | null;
  estimateLabel: string;
  guaranteed: boolean;
  icon: string; // Lucide icon name
}

export interface TrackingSummary {
  pin: string;
  status: string;
  lastEvent: string;
  lastEventDate: string | null;
  delivered: boolean;
  expectedDelivery: string | null;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface PostOffice {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  distance: number;
  hours: string;
}

// ─── STORE ORIGIN POSTAL MAP ────────────────────────────────────────────────

// Maps store IDs/names to their origin postal codes for shipping calculations.
// Falls back to env variables or the default Mississauga origin.
export const STORE_ORIGIN_POSTALS: Record<string, string> = {
  mississauga: process.env.MLC_ORIGIN_POSTAL_MISSISSAUGA || "L5B1H4",
  hamilton: process.env.MLC_ORIGIN_POSTAL_HAMILTON || "L8N1A9",
  "queen-st": process.env.MLC_ORIGIN_POSTAL_TORONTO || "M5V2A8",
  "dundas-toronto": process.env.MLC_ORIGIN_POSTAL_SCARBOROUGH || "M6J1V1",
  ottawa: process.env.MLC_ORIGIN_POSTAL_OTTAWA || "K2G4A1",
};

const DEFAULT_ORIGIN = process.env.MLC_DEFAULT_ORIGIN_POSTAL || "L5B1H4"; // Mississauga

// ─── SERVICE CODES ──────────────────────────────────────────────────────────

export const DOMESTIC_SERVICES: Record<
  string,
  { name: string; days: string; guaranteed: boolean; icon: string }
> = {
  "DOM.RP": {
    name: "Regular Parcel",
    days: "5–8 days",
    guaranteed: false,
    icon: "Package",
  },
  "DOM.EP": {
    name: "Expedited Parcel",
    days: "3–5 days",
    guaranteed: false,
    icon: "Truck",
  },
  "DOM.XP": {
    name: "Xpresspost",
    days: "2–3 days",
    guaranteed: true,
    icon: "Zap",
  },
  "DOM.PC": {
    name: "Priority",
    days: "Next day",
    guaranteed: true,
    icon: "Timer",
  },
};

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

function getConfig() {
  const user = process.env.CANADA_POST_API_USER;
  const pass = process.env.CANADA_POST_API_PASS;
  const customer = process.env.CANADA_POST_CUSTOMER_NUMBER;
  const contract = process.env.CANADA_POST_CONTRACT_NUMBER;
  const baseUrl =
    process.env.CANADA_POST_BASE_URL || "https://ct.soa-gw.canadapost.ca";

  return {
    user,
    pass,
    customer,
    contract,
    baseUrl,
    configured: !!(user && pass && customer),
  };
}

export function isCanadaPostConfigured(): boolean {
  return getConfig().configured;
}

// ─── XML HELPERS ────────────────────────────────────────────────────────────

function getTextContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function getAllBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) || [];
}

// ─── RATE CACHE (1-hour TTL) ────────────────────────────────────────────────

interface CacheEntry {
  data: ShippingRate[];
  expiresAt: number;
}
const rateCache = new Map<string, CacheEntry>();

function getCacheKey(origin: string, dest: string, weight: number): string {
  return `${origin.replace(/\s/g, "").toUpperCase()}_${dest.replace(/\s/g, "").toUpperCase()}_${weight}`;
}

// ─── FLAT-RATE FALLBACK ─────────────────────────────────────────────────────

const FLAT_RATES: ShippingRate[] = [
  {
    serviceCode: "DOM.RP",
    serviceName: "Regular Parcel",
    price: 12.99,
    transitDays: 7,
    estimateLabel: "5–8 business days",
    guaranteed: false,
    icon: "Package",
  },
  {
    serviceCode: "DOM.EP",
    serviceName: "Expedited Parcel",
    price: 16.99,
    transitDays: 4,
    estimateLabel: "3–5 business days",
    guaranteed: false,
    icon: "Truck",
  },
  {
    serviceCode: "DOM.XP",
    serviceName: "Xpresspost",
    price: 24.99,
    transitDays: 2,
    estimateLabel: "2–3 business days",
    guaranteed: true,
    icon: "Zap",
  },
  {
    serviceCode: "DOM.PC",
    serviceName: "Priority",
    price: 34.99,
    transitDays: 1,
    estimateLabel: "Next business day",
    guaranteed: true,
    icon: "Timer",
  },
];

// ─── API METHODS ────────────────────────────────────────────────────────────

/**
 * Get shipping rates from Canada Post API.
 * Falls back to flat rates if API is not configured or errors out.
 */
export async function getShippingRates(
  originPostal: string,
  destPostal: string,
  weight: number = 0.5, // kg
  dimensions?: { length: number; width: number; height: number } // cm
): Promise<ShippingRate[]> {
  const cacheKey = getCacheKey(originPostal, destPostal, weight);
  const cached = rateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const cfg = getConfig();
  if (!cfg.configured) {
    console.log("[CanadaPost] API not configured — using flat rates");
    return FLAT_RATES;
  }

  const origin = originPostal.replace(/\s/g, "").toUpperCase();
  const dest = destPostal.replace(/\s/g, "").toUpperCase();

  const dim = dimensions || { length: 25, width: 18, height: 10 }; // default small box

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
  <customer-number>${cfg.customer}</customer-number>
  ${cfg.contract ? `<contract-id>${cfg.contract}</contract-id>` : ""}
  <parcel-characteristics>
    <weight>${weight}</weight>
    <dimensions>
      <length>${dim.length}</length>
      <width>${dim.width}</width>
      <height>${dim.height}</height>
    </dimensions>
  </parcel-characteristics>
  <origin-postal-code>${origin}</origin-postal-code>
  <destination>
    <domestic>
      <postal-code>${dest}</postal-code>
    </domestic>
  </destination>
</mailing-scenario>`;

  try {
    const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");
    const res = await fetch(`${cfg.baseUrl}/rs/ship/price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.cpc.ship.rate-v4+xml",
        Accept: "application/vnd.cpc.ship.rate-v4+xml",
        Authorization: `Basic ${auth}`,
      },
      body: xmlBody,
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[CanadaPost] Rate API ${res.status}: ${body.substring(0, 200)}`
      );
      return FLAT_RATES;
    }

    const xml = await res.text();
    const quoteBlocks = getAllBlocks(xml, "price-quote");
    const rates: ShippingRate[] = [];

    for (const block of quoteBlocks) {
      const code = getTextContent(block, "service-code");
      const svc = DOMESTIC_SERVICES[code];
      if (!svc) continue; // skip non-domestic / unrecognized

      const priceStr =
        getTextContent(block, "due") || getTextContent(block, "base");
      const price = parseFloat(priceStr);
      if (isNaN(price)) continue;

      const transitStr = getTextContent(block, "expected-transit-time");
      const deliveryDateStr = getTextContent(block, "expected-delivery-date");
      const transitDays = transitStr ? parseInt(transitStr, 10) : null;

      let estimateLabel = svc.days;
      if (deliveryDateStr) {
        const d = new Date(deliveryDateStr);
        if (!isNaN(d.getTime())) {
          estimateLabel = `Est. ${d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
        }
      }

      rates.push({
        serviceCode: code,
        serviceName: svc.name,
        price: Math.round(price * 100) / 100,
        transitDays,
        estimateLabel,
        guaranteed: svc.guaranteed,
        icon: svc.icon,
      });
    }

    // Sort cheapest first
    rates.sort((a, b) => a.price - b.price);

    if (rates.length === 0) {
      console.warn("[CanadaPost] No rates returned — using flat rates");
      return FLAT_RATES;
    }

    // Cache for 1 hour
    rateCache.set(cacheKey, { data: rates, expiresAt: Date.now() + 3_600_000 });
    return rates;
  } catch (err) {
    console.error("[CanadaPost] Rate lookup error:", (err as Error).message);
    return FLAT_RATES;
  }
}

/**
 * Get tracking summary for a Canada Post PIN.
 */
export async function getTrackingSummary(
  pin: string
): Promise<TrackingSummary | null> {
  const cfg = getConfig();
  if (!cfg.configured) return null;

  const cleanPin = pin.replace(/[\s-]/g, "").toUpperCase();

  try {
    const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");
    const res = await fetch(
      `${cfg.baseUrl}/vis/track/pin/${cleanPin}/summary`,
      {
        headers: {
          Accept: "application/vnd.cpc.track-v2+xml",
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      const body = await res.text();
      console.warn(
        `[CanadaPost] Track API ${res.status}: ${body.substring(0, 200)}`
      );
      return null;
    }

    const xml = await res.text();
    return parseTrackingXml(cleanPin, xml);
  } catch (err) {
    console.error("[CanadaPost] Tracking error:", (err as Error).message);
    return null;
  }
}

/**
 * Get detailed tracking events.
 */
export async function getTrackingDetails(
  pin: string
): Promise<TrackingSummary | null> {
  const cfg = getConfig();
  if (!cfg.configured) return null;

  const cleanPin = pin.replace(/[\s-]/g, "").toUpperCase();

  try {
    const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");
    const res = await fetch(`${cfg.baseUrl}/vis/track/pin/${cleanPin}/detail`, {
      headers: {
        Accept: "application/vnd.cpc.track-v2+xml",
        Authorization: `Basic ${auth}`,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      return null;
    }

    const xml = await res.text();
    return parseTrackingXml(cleanPin, xml);
  } catch (err) {
    console.error(
      "[CanadaPost] Tracking detail error:",
      (err as Error).message
    );
    return null;
  }
}

function parseTrackingXml(pin: string, xml: string): TrackingSummary {
  // Parse events
  const eventBlocks = getAllBlocks(xml, "occurrence");
  const events: TrackingEvent[] = eventBlocks.map(block => ({
    date: getTextContent(block, "event-date"),
    time: getTextContent(block, "event-time"),
    location:
      getTextContent(block, "event-site") ||
      getTextContent(block, "event-province"),
    description: getTextContent(block, "event-description"),
  }));

  // Parse top-level fields
  const actualDelivery = getTextContent(xml, "actual-delivery-date");
  const expectedDelivery =
    getTextContent(xml, "expected-delivery-date") ||
    getTextContent(xml, "attempted-date");
  const eventType = getTextContent(xml, "event-type");
  const eventDescription = getTextContent(xml, "event-description");

  const delivered =
    !!actualDelivery ||
    /delivered|livr/i.test(eventDescription) ||
    eventType === "delivery";

  let status = "In Transit";
  if (delivered) status = "Delivered";
  else if (/out.for.delivery/i.test(eventDescription))
    status = "Out for Delivery";
  else if (/item.accepted/i.test(eventDescription)) status = "Accepted";
  else if (/in.transit/i.test(eventDescription)) status = "In Transit";
  else if (/notice.left/i.test(eventDescription)) status = "Notice Left";

  return {
    pin,
    status,
    lastEvent:
      eventDescription || events[0]?.description || "Tracking info available",
    lastEventDate: events[0]?.date || null,
    delivered,
    expectedDelivery: expectedDelivery || null,
    events,
  };
}

/**
 * Find nearby post offices by postal code.
 */
export async function findPostOffices(
  postalCode: string,
  maxResults: number = 5
): Promise<PostOffice[]> {
  const cfg = getConfig();
  if (!cfg.configured) return [];

  const clean = postalCode.replace(/\s/g, "").toUpperCase();

  try {
    const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");
    const res = await fetch(
      `${cfg.baseUrl}/rs/postoffice?d2po=true&postalCode=${clean}&maximumNumberOfResults=${maxResults}`,
      {
        headers: {
          Accept: "application/vnd.cpc.postoffice+xml",
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!res.ok) return [];

    const xml = await res.text();
    const blocks = getAllBlocks(xml, "post-office");

    return blocks.map(block => ({
      id: getTextContent(block, "office-id"),
      name: getTextContent(block, "name"),
      address: getTextContent(block, "office-address"),
      city: getTextContent(block, "municipality"),
      province: getTextContent(block, "province"),
      postalCode: getTextContent(block, "postal-code"),
      distance: parseFloat(getTextContent(block, "distance")) || 0,
      hours: getTextContent(block, "hours-list") || "See Canada Post website",
    }));
  } catch (err) {
    console.error(
      "[CanadaPost] Post office search error:",
      (err as Error).message
    );
    return [];
  }
}

/**
 * Validate a Canadian postal code format.
 */
export function validatePostalCode(code: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  const clean = code.replace(/\s/g, "").toUpperCase();
  const re = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
  if (!re.test(clean)) {
    return {
      valid: false,
      formatted: clean,
      error: "Invalid Canadian postal code (format: A1A 1A1)",
    };
  }
  // Format nicely
  const formatted = `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return { valid: true, formatted };
}

/**
 * Resolve the origin postal code for a given store.
 * Falls back to the default origin (Mississauga) if no match.
 */
export function getOriginPostal(storeNameOrId?: string): string {
  if (!storeNameOrId) return DEFAULT_ORIGIN;
  const key = storeNameOrId.toLowerCase().replace(/\s+/g, "-");
  for (const [k, v] of Object.entries(STORE_ORIGIN_POSTALS)) {
    if (key.includes(k)) return v;
  }
  return DEFAULT_ORIGIN;
}

/**
 * Poll Canada Post tracking API for all shipped orders and auto-update statuses.
 * Returns the number of orders updated.
 */
export async function pollCanadaPostTracking(
  shippedOrders: Array<{
    id: number;
    orderNumber: string;
    trackingNumber: string | null;
  }>,
  updateCallback: (
    orderId: number,
    data: { status: string; delivered: boolean; expectedDelivery?: string }
  ) => Promise<void>
): Promise<{ checked: number; delivered: number; errors: number }> {
  const stats = { checked: 0, delivered: 0, errors: 0 };

  if (!isCanadaPostConfigured()) return stats;

  for (const order of shippedOrders) {
    if (!order.trackingNumber) continue;

    try {
      stats.checked++;
      const summary = await getTrackingSummary(order.trackingNumber);
      if (!summary) continue;

      if (summary.delivered) {
        await updateCallback(order.id, {
          status: "delivered",
          delivered: true,
          expectedDelivery: summary.expectedDelivery || undefined,
        });
        stats.delivered++;
        console.log(
          `[CanadaPost] Order ${order.orderNumber} tracking ${order.trackingNumber} — delivered`
        );
      }
    } catch (err) {
      stats.errors++;
      console.warn(
        `[CanadaPost] Tracking poll error for ${order.orderNumber}:`,
        (err as Error).message
      );
    }

    // Rate-limit: 100ms between API calls
    await new Promise(r => setTimeout(r, 100));
  }

  return stats;
}
