import { describe, expect, it } from "vitest";
import { injectSeoMeta } from "./_core/seo-middleware";
import fs from "fs";
import path from "path";

/**
 * Tests for the server-side SEO middleware (seo-middleware.ts).
 *
 * These tests verify that injectSeoMeta correctly replaces:
 *   - __SITE_URL__ placeholders
 *   - Per-route <title>, meta description, canonical, OG tags, Twitter tags
 *   - JSON-LD structured data injection
 *
 * CRITICAL: The built HTML puts <!--seo:X--> comments on separate lines
 * from their tags (with newline + indentation). The regex must handle this.
 */

// Simulate the multi-line HTML that Vite produces (comment on one line, tag on the next)
const MOCK_HTML = `<!doctype html>
<html lang="en-CA">
  <head>
    <!--seo:description-->
    <meta
      name="description"
      content="Default description"
    />
    <!--seo:canonical-->
    <link rel="canonical" href="__SITE_URL__/" />
    <!--seo:og:title-->
    <meta
      property="og:title"
      content="Default OG Title"
    />
    <!--seo:og:description-->
    <meta
      property="og:description"
      content="Default OG Description"
    />
    <!--seo:og:url-->
    <meta property="og:url" content="__SITE_URL__/" />
    <!--seo:twitter:title-->
    <meta
      name="twitter:title"
      content="Default Twitter Title"
    />
    <!--seo:twitter:description-->
    <meta
      name="twitter:description"
      content="Default Twitter Description"
    />
    <!--seo:title-->
    <title>Default Title</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe("seo-middleware: injectSeoMeta", () => {
  it("replaces __SITE_URL__ placeholders everywhere", () => {
    const result = injectSeoMeta(MOCK_HTML, "/");
    expect(result).not.toContain("__SITE_URL__");
    expect(result).toContain(
      "https://mylegacycannabisca-production.up.railway.app"
    );
  });

  it("injects correct <title> for homepage", () => {
    const result = injectSeoMeta(MOCK_HTML, "/");
    expect(result).toContain(
      "<title>My Legacy Cannabis \u2014 24/7 Cannabis Dispensary | GTA &amp; Ottawa</title>"
    );
  });

  it("injects correct <title> for /shop", () => {
    const result = injectSeoMeta(MOCK_HTML, "/shop");
    expect(result).toContain(
      "Shop Cannabis Online \u2014 Flower, Edibles, Vapes &amp; More | My Legacy Cannabis"
    );
  });

  it("injects correct meta description for /locations", () => {
    const result = injectSeoMeta(MOCK_HTML, "/locations");
    expect(result).toContain(
      'content="Visit any of our 5 My Legacy Cannabis locations'
    );
  });

  it("injects correct canonical URL for /about", () => {
    const result = injectSeoMeta(MOCK_HTML, "/about");
    expect(result).toContain(
      'rel="canonical" href="https://mylegacycannabisca-production.up.railway.app/about"'
    );
  });

  it("injects OG and Twitter tags for category page", () => {
    const result = injectSeoMeta(MOCK_HTML, "/shop/flower");
    expect(result).toContain('og:title" content="Cannabis Flower');
    expect(result).toContain('twitter:title" content="Cannabis Flower');
    expect(result).toContain(
      'og:url" content="https://mylegacycannabisca-production.up.railway.app/shop/flower"'
    );
  });

  it("generates sensible title for product pages from slug", () => {
    const result = injectSeoMeta(MOCK_HTML, "/product/pink-kush-3-5g");
    expect(result).toContain("Pink Kush 3 5g");
    expect(result).toContain("Buy Online | My Legacy Cannabis");
  });

  it("injects Product JSON-LD for product pages", () => {
    const result = injectSeoMeta(MOCK_HTML, "/product/pink-kush");
    expect(result).toContain('"@type":"Product"');
    expect(result).toContain('"@type":"BreadcrumbList"');
  });

  it("injects BreadcrumbList JSON-LD for category pages", () => {
    const result = injectSeoMeta(MOCK_HTML, "/shop/edibles");
    expect(result).toContain('"@type":"BreadcrumbList"');
    expect(result).toContain('"name":"Edibles"');
  });

  it("injects LocalBusiness JSON-LD for /locations", () => {
    const result = injectSeoMeta(MOCK_HTML, "/locations");
    expect(result).toContain('"@type":"LocalBusiness"');
    expect(result).toContain("255 Dundas St W"); // Mississauga
    expect(result).toContain("320 Rideau St"); // Ottawa
  });

  it("injects BreadcrumbList for static pages", () => {
    const result = injectSeoMeta(MOCK_HTML, "/faq");
    expect(result).toContain('"@type":"BreadcrumbList"');
    expect(result).toContain('"name":"FAQ"');
  });

  it("handles unknown paths gracefully (only replaces __SITE_URL__)", () => {
    const result = injectSeoMeta(MOCK_HTML, "/unknown-page");
    expect(result).not.toContain("__SITE_URL__");
    // Should still have the default title since no meta matched
    expect(result).toContain("Default Title");
  });

  it("canonical URL has no trailing slash for non-root pages", () => {
    const result = injectSeoMeta(MOCK_HTML, "/shop");
    // Should be /shop, NOT /shop/
    expect(result).toContain(
      'canonical" href="https://mylegacycannabisca-production.up.railway.app/shop"'
    );
  });
});
