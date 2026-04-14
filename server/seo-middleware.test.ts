import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
  buildProductJsonLd,
  buildLocalBusinessJsonLd,
  injectSeoMeta,
} from "./_core/seo-middleware";

// Mock the drizzle DB module — this prevents any real DB connection
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => null),
}));

vi.mock("postgres", () => ({
  default: vi.fn(() => null),
}));

// Mock the internal getSeoDb by mocking the environment
// When DATABASE_URL is empty, getSeoDb() returns null → graceful fallback
const originalEnv = process.env.DATABASE_URL;

describe("Product JSON-LD — no DB (graceful degradation)", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (originalEnv) process.env.DATABASE_URL = originalEnv;
  });

  it("returns valid Product schema with slug-derived name", async () => {
    const jsonLd = (await buildProductJsonLd(
      "pink-kush",
      "https://mylegacycannabisca-production.up.railway.app/product/pink-kush"
    )) as any;

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe("Pink Kush");
    expect(jsonLd.offers["@type"]).toBe("Offer");
    expect(jsonLd.offers.priceCurrency).toBe("CAD");
    // No price when DB unavailable — this is acceptable degradation
    expect(jsonLd.offers.price).toBeUndefined();
  });

  it("includes shippingDetails and returnPolicy even without DB", async () => {
    const jsonLd = (await buildProductJsonLd(
      "pink-kush",
      "https://mylegacycannabisca-production.up.railway.app/product/pink-kush"
    )) as any;

    expect(jsonLd.offers.shippingDetails["@type"]).toBe("OfferShippingDetails");
    expect(jsonLd.offers.hasMerchantReturnPolicy["@type"]).toBe(
      "MerchantReturnPolicy"
    );
  });

  it("does not include aggregateRating without DB", async () => {
    const jsonLd = (await buildProductJsonLd(
      "pink-kush",
      "https://mylegacycannabisca-production.up.railway.app/product/pink-kush"
    )) as any;

    expect(jsonLd.aggregateRating).toBeUndefined();
  });
});

describe("LocalBusiness JSON-LD", () => {
  it("includes top-level image property on every location", () => {
    const locations = buildLocalBusinessJsonLd() as any[];
    expect(locations.length).toBe(5);
    for (const loc of locations) {
      expect(loc["@type"]).toBe("LocalBusiness");
      expect(loc.image).toBeDefined();
      expect(
        typeof loc.image === "string" ? loc.image : loc.image[0]
      ).toContain("logo.webp");
    }
  });
});

describe("injectSeoMeta", () => {
  // Use a minimal HTML template that mirrors the Vite build output
  const template = `<!DOCTYPE html>
<html>
<head>
  <!--seo:title-->
    <title>Default Title</title>
  <!--seo:description-->
    <meta name="description" content="Default description">
  <!--seo:canonical-->
    <link rel="canonical" href="__SITE_URL__">
  <!--seo:og:title-->
    <meta property="og:title" content="Default Title">
  <!--seo:og:description-->
    <meta property="og:description" content="Default description">
  <!--seo:og:url-->
    <meta property="og:url" content="__SITE_URL__">
  <!--seo:twitter:title-->
    <meta name="twitter:title" content="Default Title">
  <!--seo:twitter:description-->
    <meta name="twitter:description" content="Default description">
</head>
<body><div id="root"></div></body>
</html>`;

  it("injects product-specific title for /product/pink-kush", async () => {
    const result = await injectSeoMeta(template, "/product/pink-kush");
    expect(result).toContain("<title>Pink Kush");
    expect(result).toContain("Buy Online");
  });

  it("replaces __SITE_URL__ placeholders", async () => {
    const result = await injectSeoMeta(template, "/");
    expect(result).not.toContain("__SITE_URL__");
    expect(result).toContain("mylegacycannabisca-production.up.railway.app");
  });

  it("injects JSON-LD for product pages", async () => {
    const result = await injectSeoMeta(template, "/product/pink-kush");
    expect(result).toContain("application/ld+json");
    expect(result).toContain('"@type":"Product"');
  });

  it("injects LocalBusiness JSON-LD for /locations", async () => {
    const result = await injectSeoMeta(template, "/locations");
    expect(result).toContain("application/ld+json");
    expect(result).toContain('"@type":"LocalBusiness"');
  });
});
