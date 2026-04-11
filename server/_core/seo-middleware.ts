/**
 * Express middleware that performs server-side SEO injection for bots.
 *
 * Bots (Googlebot, Facebook, Twitter, etc.) receive the raw HTML before
 * React executes. This middleware ensures every route gets:
 *   1. The correct <title>
 *   2. The correct <meta name="description">
 *   3. The correct <meta property="og:title/description/url">
 *   4. The correct <meta name="twitter:title/description">
 *   5. The correct <link rel="canonical">
 *   6. __SITE_URL__ replaced with the real site URL
 *   7. Per-route JSON-LD structured data (Product, BreadcrumbList, LocalBusiness)
 *
 * CRITICAL FIX (2026-04-11): Previous regex patterns expected comment markers
 * and tags on the same line (e.g. <!--seo:title--><title>), but Vite's HTML
 * output puts them on separate lines with whitespace:
 *   <!--seo:title-->
 *       <title>...</title>
 * The new patterns use [\s\S]*? (or \s*) to bridge newlines + indentation.
 */

// ── SEO route metadata ──────────────────────────────────────
const SITE_URL =
  process.env.SITE_URL ||
  "https://mylegacycannabisca-production.up.railway.app";

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "My Legacy Cannabis \u2014 24/7 Cannabis Dispensary | GTA & Ottawa",
    description:
      "24/7 cannabis dispensary with 5 GTA & Ottawa locations. Shop flower, edibles, vapes & more. Free shipping over $150 Canada-wide. No taxes on any order.",
  },
  "/shop": {
    title:
      "Shop Cannabis Online \u2014 Flower, Edibles, Vapes & More | My Legacy Cannabis",
    description:
      "Browse our full selection of premium cannabis products \u2014 flower, pre-rolls, edibles, vapes, concentrates, and accessories. Free shipping on orders over $150.",
  },
  "/rewards": {
    title:
      "My Legacy Rewards \u2014 Loyalty Program | Earn Points Every Purchase",
    description:
      "Earn 1 point for every $1 spent at My Legacy Cannabis. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up.",
  },
  "/locations": {
    title: "Store Locations \u2014 24/7 Cannabis Dispensaries in GTA & Ottawa",
    description:
      "Visit any of our 5 My Legacy Cannabis locations in Mississauga, Hamilton, Toronto (Queen St & Dundas), and Ottawa. Open 24/7 with free parking.",
  },
  "/about": {
    title: "About Us \u2014 My Legacy Cannabis | Our Story & Mission",
    description:
      "Learn about My Legacy Cannabis \u2014 a 24/7 cannabis dispensary serving the GTA and Ottawa since 2020. Our mission, values, and commitment to premium cannabis products.",
  },
  "/shipping": {
    title: "Shipping Policy \u2014 Nationwide Cannabis Delivery Across Canada",
    description:
      "My Legacy Cannabis ships nationwide across Canada. Free shipping on orders over $150. Ontario $10, Quebec $12, Western Canada $15, Atlantic $18, Territories $25.",
  },
  "/contact": {
    title: "Contact Us \u2014 My Legacy Cannabis | Phone, Email & Locations",
    description:
      "Get in touch with My Legacy Cannabis. Contact us by phone at (437) 215-4722, email support@mylegacycannabis.ca, or visit any of our 5 locations. Open 24/7.",
  },
  "/faq": {
    title: "FAQ \u2014 Frequently Asked Questions | My Legacy Cannabis",
    description:
      "Find answers to common questions about ordering, shipping, payment, ID verification, and the My Legacy Rewards program at My Legacy Cannabis.",
  },
  "/privacy-policy": {
    title: "Privacy Policy \u2014 My Legacy Cannabis",
    description:
      "My Legacy Cannabis privacy policy. Learn how we collect, use, and protect your personal information in accordance with Canadian privacy laws.",
  },
  "/terms": {
    title: "Terms & Conditions \u2014 My Legacy Cannabis",
    description:
      "My Legacy Cannabis terms and conditions of use. Read our policies on ordering, shipping, returns, age verification, and more.",
  },
};

// Category SEO
const CATEGORY_META: Record<string, RouteMeta> = {
  flower: {
    title: "Cannabis Flower \u2014 Premium Buds | My Legacy Cannabis",
    description:
      "Shop premium cannabis flower at My Legacy Cannabis. Indica, Sativa, and Hybrid strains. Free shipping on orders over $150.",
  },
  "pre-rolls": {
    title:
      "Pre-Rolls \u2014 Ready-to-Smoke Cannabis Joints | My Legacy Cannabis",
    description:
      "Shop pre-rolled joints and blunts at My Legacy Cannabis. Singles, multi-packs, and infused pre-rolls available.",
  },
  edibles: {
    title:
      "Cannabis Edibles \u2014 Gummies, Chocolates & More | My Legacy Cannabis",
    description:
      "Shop cannabis edibles at My Legacy Cannabis. Gummies, chocolates, beverages, and baked goods. Precise dosing for every experience.",
  },
  vapes: {
    title: "Vape Cartridges & Pens \u2014 Cannabis Vapes | My Legacy Cannabis",
    description:
      "Shop cannabis vape cartridges, disposable pens, and 510 carts at My Legacy Cannabis. Premium distillate and live resin options.",
  },
  concentrates: {
    title:
      "Cannabis Concentrates \u2014 Shatter, Wax & Hash | My Legacy Cannabis",
    description:
      "Shop cannabis concentrates at My Legacy Cannabis. Shatter, wax, hash, live resin, and rosin. Premium extracts for experienced users.",
  },
  "ounce-deals": {
    title: "Ounce Deals \u2014 Bulk Cannabis Savings | My Legacy Cannabis",
    description:
      "Save big with ounce deals at My Legacy Cannabis. Premium flower by the ounce at the best prices. Free shipping over $150.",
  },
  "shake-n-bake": {
    title: "Shake & Bake \u2014 Budget Cannabis | My Legacy Cannabis",
    description:
      "Shop affordable shake and trim at My Legacy Cannabis. Perfect for edibles, joints, and budget-conscious consumers.",
  },
  accessories: {
    title:
      "Cannabis Accessories \u2014 Papers, Pipes & Grinders | My Legacy Cannabis",
    description:
      "Shop cannabis accessories at My Legacy Cannabis. Rolling papers, pipes, grinders, bongs, and storage containers.",
  },
};

// ── Store locations for server-side LocalBusiness JSON-LD ─────
const STORE_LOCATIONS = [
  {
    id: "mississauga",
    name: "Mississauga — Dundas",
    address: "255 Dundas St W",
    city: "Mississauga",
    province: "ON",
    postalCode: "L5B 1H4",
    phone: "+14372154722",
    lat: 43.5897,
    lng: -79.6524,
  },
  {
    id: "hamilton",
    name: "Hamilton — King St",
    address: "688 King St W",
    city: "Hamilton",
    province: "ON",
    postalCode: "L8P 1C2",
    phone: "+12892002722",
    lat: 43.2571,
    lng: -79.8868,
  },
  {
    id: "toronto-queen",
    name: "Toronto — Queen St",
    address: "696 Queen St W",
    city: "Toronto",
    province: "ON",
    postalCode: "M6J 1E4",
    phone: "+14379294722",
    lat: 43.6472,
    lng: -79.4085,
  },
  {
    id: "toronto-dundas",
    name: "Toronto — Dundas",
    address: "761 Dundas St W",
    city: "Toronto",
    province: "ON",
    postalCode: "M6J 1T9",
    phone: "+14372154722",
    lat: 43.6508,
    lng: -79.4073,
  },
  {
    id: "ottawa",
    name: "Ottawa — Rideau",
    address: "320 Rideau St",
    city: "Ottawa",
    province: "ON",
    postalCode: "K1N 5Y3",
    phone: "+16136954722",
    lat: 45.4292,
    lng: -75.6838,
  },
];

function getMetaForPath(path: string): RouteMeta | null {
  // Exact match
  if (ROUTE_META[path]) return ROUTE_META[path];

  // Category match: /shop/:slug
  const catMatch = path.match(/^\/shop\/([a-z0-9-]+)$/);
  if (catMatch && CATEGORY_META[catMatch[1]]) return CATEGORY_META[catMatch[1]];

  // Product match: /product/:slug — derive title from slug
  if (path.startsWith("/product/")) {
    const slug = path.replace("/product/", "").replace(/-/g, " ");
    const name = slug.replace(/\b\w/g, l => l.toUpperCase());
    return {
      title: `${name} \u2014 Buy Online | My Legacy Cannabis`,
      description: `Shop ${name} at My Legacy Cannabis. Premium cannabis products with free shipping over $150 across Canada. 24/7 dispensary, no taxes.`,
    };
  }

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build BreadcrumbList JSON-LD for a given path.
 */
function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Build a server-side Product JSON-LD stub from slug-derived metadata.
 * The real product data (price, stock, image) is only available client-side
 * via tRPC, but providing a basic schema signals to Google that this is a
 * product page and enables breadcrumb-level rich results.
 */
function buildProductJsonLd(slug: string, canonicalUrl: string): object {
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name,
    description: `Shop ${name} at My Legacy Cannabis. Premium cannabis with free shipping over $150.`,
    image: [`${SITE_URL}/logo.webp`],
    sku: `MLC-${slug}`,
    brand: {
      "@type": "Brand",
      name: "My Legacy Cannabis",
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "My Legacy Cannabis",
        url: SITE_URL,
      },
    },
  };
}

/**
 * Build LocalBusiness JSON-LD array for the Locations page.
 */
function buildLocalBusinessJsonLd(): object[] {
  return STORE_LOCATIONS.map(loc => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/locations#${loc.id}`,
    name: `My Legacy Cannabis \u2014 ${loc.name}`,
    image: [`${SITE_URL}/logo.webp`],
    url: `${SITE_URL}/locations`,
    telephone: loc.phone,
    email: "support@mylegacycannabis.ca",
    priceRange: "$$",
    currenciesAccepted: "CAD",
    paymentAccepted: "Cash, Credit Card, Debit Card, E-Transfer",
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.address,
      addressLocality: loc.city,
      addressRegion: loc.province,
      postalCode: loc.postalCode,
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: loc.lat,
      longitude: loc.lng,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  }));
}

/**
 * Generate per-route JSON-LD structured data to inject server-side.
 * Returns an array of JSON-LD objects (or empty array if none applicable).
 */
function getStructuredDataForPath(
  path: string,
  canonicalUrl: string
): object[] {
  const schemas: object[] = [];

  // Product pages: Product + BreadcrumbList
  if (path.startsWith("/product/")) {
    const slug = path.replace("/product/", "");
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    schemas.push(buildProductJsonLd(slug, canonicalUrl));
    schemas.push(
      buildBreadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Shop", url: `${SITE_URL}/shop` },
        { name, url: canonicalUrl },
      ])
    );
    return schemas;
  }

  // Category pages: BreadcrumbList
  const catMatch = path.match(/^\/shop\/([a-z0-9-]+)$/);
  if (catMatch) {
    const catSlug = catMatch[1];
    const catName = catSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
    schemas.push(
      buildBreadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Shop", url: `${SITE_URL}/shop` },
        { name: catName, url: canonicalUrl },
      ])
    );
    return schemas;
  }

  // Locations page: BreadcrumbList + LocalBusiness per store
  if (path === "/locations") {
    schemas.push(
      buildBreadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Store Locations", url: canonicalUrl },
      ])
    );
    schemas.push(...buildLocalBusinessJsonLd());
    return schemas;
  }

  // Standard pages: BreadcrumbList
  const PAGE_NAMES: Record<string, string> = {
    "/": "Home",
    "/shop": "Shop",
    "/rewards": "My Legacy Rewards",
    "/about": "About Us",
    "/shipping": "Shipping Policy",
    "/contact": "Contact Us",
    "/faq": "FAQ",
    "/privacy-policy": "Privacy Policy",
    "/terms": "Terms & Conditions",
  };
  if (PAGE_NAMES[path]) {
    const items =
      path === "/"
        ? [{ name: "Home", url: SITE_URL }]
        : [
            { name: "Home", url: SITE_URL },
            { name: PAGE_NAMES[path], url: canonicalUrl },
          ];
    schemas.push(buildBreadcrumbJsonLd(items));
  }

  return schemas;
}

/**
 * Inject per-route <title>, <meta description>, OG tags, canonical,
 * and structured data into the HTML template before sending to the browser/bot.
 *
 * CRITICAL: Regex patterns use \s* between comment markers and tags to handle
 * both same-line (minified) and multi-line (Vite dev/build) HTML output.
 */
export function injectSeoMeta(html: string, requestPath: string): string {
  const meta = getMetaForPath(requestPath);
  const canonicalUrl = `${SITE_URL}${requestPath === "/" ? "" : requestPath}`;

  // 1) Replace __SITE_URL__ placeholder throughout
  let result = html.replace(/__SITE_URL__/g, SITE_URL);

  if (meta) {
    const safeTitle = escapeHtml(meta.title);
    const safeDesc = escapeHtml(meta.description);

    // 2) Replace <title> — \s* bridges newline + indent between comment and tag
    result = result.replace(
      /<!--seo:title-->\s*<title>[^<]*<\/title>/,
      `<!--seo:title--><title>${safeTitle}</title>`
    );

    // 3) Replace meta description
    result = result.replace(
      /<!--seo:description-->\s*<meta\s+name="description"\s+content="[^"]*"/,
      `<!--seo:description--><meta name="description" content="${safeDesc}"`
    );

    // 4) Replace canonical
    result = result.replace(
      /<!--seo:canonical-->\s*<link\s+rel="canonical"\s+href="[^"]*"/,
      `<!--seo:canonical--><link rel="canonical" href="${escapeHtml(canonicalUrl)}"`
    );

    // 5) Replace OG title
    result = result.replace(
      /<!--seo:og:title-->\s*<meta\s+property="og:title"\s+content="[^"]*"/,
      `<!--seo:og:title--><meta property="og:title" content="${safeTitle}"`
    );

    // 6) Replace OG description
    result = result.replace(
      /<!--seo:og:description-->\s*<meta\s+property="og:description"\s+content="[^"]*"/,
      `<!--seo:og:description--><meta property="og:description" content="${safeDesc}"`
    );

    // 7) Replace OG URL
    result = result.replace(
      /<!--seo:og:url-->\s*<meta\s+property="og:url"\s+content="[^"]*"/,
      `<!--seo:og:url--><meta property="og:url" content="${escapeHtml(canonicalUrl)}"`
    );

    // 8) Replace Twitter title
    result = result.replace(
      /<!--seo:twitter:title-->\s*<meta\s+name="twitter:title"\s+content="[^"]*"/,
      `<!--seo:twitter:title--><meta name="twitter:title" content="${safeTitle}"`
    );

    // 9) Replace Twitter description
    result = result.replace(
      /<!--seo:twitter:description-->\s*<meta\s+name="twitter:description"\s+content="[^"]*"/,
      `<!--seo:twitter:description--><meta name="twitter:description" content="${safeDesc}"`
    );
  }

  // 10) Inject per-route JSON-LD structured data before </head>
  const schemas = getStructuredDataForPath(requestPath, canonicalUrl);
  if (schemas.length > 0) {
    const jsonLdTags = schemas
      .map(
        s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`
      )
      .join("\n    ");
    result = result.replace("</head>", `    ${jsonLdTags}\n  </head>`);
  }

  return result;
}
