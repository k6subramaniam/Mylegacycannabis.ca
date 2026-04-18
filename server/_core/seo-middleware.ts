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
 *
 * The middleware wraps Express res.send() so it intercepts the final
 * HTML before it reaches the client.
 */

// ── SEO route metadata ──────────────────────────────────────
// This is a server-side mirror of client/src/lib/seo-config.ts
// We duplicate it here so the server bundle doesn't import client code.
const SITE_URL = process.env.SITE_URL || "https://mylegacycannabisca-production.up.railway.app";

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "My Legacy Cannabis \u2014 24/7 Cannabis Dispensary | GTA & Ottawa",
    description: "24/7 cannabis dispensary with 5 GTA & Ottawa locations. Shop flower, edibles, vapes & more. Free shipping over $150 Canada-wide. No taxes on any order.",
  },
  "/shop": {
    title: "Shop Cannabis Online \u2014 Flower, Edibles, Vapes & More | My Legacy Cannabis",
    description: "Browse our full selection of premium cannabis products \u2014 flower, pre-rolls, edibles, vapes, concentrates, and accessories. Free shipping on orders over $150.",
  },
  "/rewards": {
    title: "My Legacy Rewards \u2014 Loyalty Program | Earn Points Every Purchase",
    description: "Earn 1 point for every $1 spent at My Legacy Cannabis. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up.",
  },
  "/locations": {
    title: "Store Locations \u2014 24/7 Cannabis Dispensaries in GTA & Ottawa",
    description: "Visit any of our 5 My Legacy Cannabis locations in Mississauga, Hamilton, Toronto (Queen St & Dundas), and Ottawa. Open 24/7 with free parking.",
  },
  "/about": {
    title: "About Us \u2014 My Legacy Cannabis | Our Story & Mission",
    description: "Learn about My Legacy Cannabis \u2014 a 24/7 cannabis dispensary serving the GTA and Ottawa since 2020. Our mission, values, and commitment to premium cannabis products.",
  },
  "/shipping": {
    title: "Shipping Policy \u2014 Nationwide Cannabis Delivery Across Canada",
    description: "My Legacy Cannabis ships nationwide across Canada. Free shipping on orders over $150. Ontario $10, Quebec $12, Western Canada $15, Atlantic $18, Territories $25.",
  },
  "/contact": {
    title: "Contact Us \u2014 My Legacy Cannabis | Phone, Email & Locations",
    description: "Get in touch with My Legacy Cannabis. Contact us by phone at (437) 215-4722, email support@mylegacycannabis.ca, or visit any of our 5 locations. Open 24/7.",
  },
  "/faq": {
    title: "FAQ \u2014 Frequently Asked Questions | My Legacy Cannabis",
    description: "Find answers to common questions about ordering, shipping, payment, ID verification, and the My Legacy Rewards program at My Legacy Cannabis.",
  },
  "/privacy-policy": {
    title: "Privacy Policy \u2014 My Legacy Cannabis",
    description: "My Legacy Cannabis privacy policy. Learn how we collect, use, and protect your personal information in accordance with Canadian privacy laws.",
  },
  "/terms": {
    title: "Terms & Conditions \u2014 My Legacy Cannabis",
    description: "My Legacy Cannabis terms and conditions of use. Read our policies on ordering, shipping, returns, age verification, and more.",
  },
};

// Category SEO
const CATEGORY_META: Record<string, RouteMeta> = {
  flower: { title: "Cannabis Flower \u2014 Premium Buds | My Legacy Cannabis", description: "Shop premium cannabis flower at My Legacy Cannabis. Indica, Sativa, and Hybrid strains. Free shipping on orders over $150." },
  "pre-rolls": { title: "Pre-Rolls \u2014 Ready-to-Smoke Cannabis Joints | My Legacy Cannabis", description: "Shop pre-rolled joints and blunts at My Legacy Cannabis." },
  edibles: { title: "Cannabis Edibles \u2014 Gummies, Chocolates & More | My Legacy Cannabis", description: "Shop cannabis edibles at My Legacy Cannabis." },
  vapes: { title: "Vape Cartridges & Pens \u2014 Cannabis Vapes | My Legacy Cannabis", description: "Shop cannabis vape cartridges, disposable pens, and 510 carts." },
  concentrates: { title: "Cannabis Concentrates \u2014 Shatter, Wax & Hash | My Legacy Cannabis", description: "Shop cannabis concentrates at My Legacy Cannabis." },
  "ounce-deals": { title: "Ounce Deals \u2014 Bulk Cannabis Savings | My Legacy Cannabis", description: "Save big with ounce deals at My Legacy Cannabis." },
  "shake-n-bake": { title: "Shake & Bake \u2014 Budget Cannabis | My Legacy Cannabis", description: "Shop affordable shake and trim at My Legacy Cannabis." },
  accessories: { title: "Cannabis Accessories \u2014 Papers, Pipes & Grinders | My Legacy Cannabis", description: "Shop cannabis accessories at My Legacy Cannabis." },
};

function getMetaForPath(path: string): RouteMeta | null {
  // Exact match
  if (ROUTE_META[path]) return ROUTE_META[path];

  // Category match: /shop/:slug
  const catMatch = path.match(/^\/shop\/([a-z0-9-]+)$/);
  if (catMatch && CATEGORY_META[catMatch[1]]) return CATEGORY_META[catMatch[1]];

  // Product match: /product/:slug — will be handled dynamically later
  // For now, return a sensible default
  if (path.startsWith("/product/")) {
    const slug = path.replace("/product/", "").replace(/-/g, " ");
    const name = slug.replace(/\b\w/g, l => l.toUpperCase());
    return {
      title: `${name} | My Legacy Cannabis`,
      description: `Shop ${name} at My Legacy Cannabis. Premium cannabis products with free shipping over $150.`,
    };
  }

  return null;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Inject per-route <title>, <meta description>, OG tags, and canonical
 * into the HTML template before sending to the browser/bot.
 */
export function injectSeoMeta(html: string, requestPath: string): string {
  const meta = getMetaForPath(requestPath);
  const canonicalUrl = `${SITE_URL}${requestPath === "/" ? "/" : requestPath}`;


  // 1) Replace __SITE_URL__ placeholder throughout
  let result = html.replace(/__SITE_URL__/g, SITE_URL);

  if (meta) {

    const safeTitle = escapeHtml(meta.title);
    const safeDesc = escapeHtml(meta.description);

    // 2) Replace <title>
    result = result.replace(
      /<!--seo:title--><title>[^<]*<\/title>/,
      `<!--seo:title--><title>${safeTitle}</title>`
    );

    // 3) Replace meta description
    result = result.replace(
      /<!--seo:description--><meta name="description" content="[^"]*"/,
      `<!--seo:description--><meta name="description" content="${safeDesc}"`
    );

    // 4) Replace canonical
    result = result.replace(
      /<!--seo:canonical--><link rel="canonical" href="[^"]*"/,
      `<!--seo:canonical--><link rel="canonical" href="${escapeHtml(canonicalUrl)}"`
    );

    // 5) Replace OG title
    result = result.replace(
      /<!--seo:og:title--><meta property="og:title" content="[^"]*"/,
      `<!--seo:og:title--><meta property="og:title" content="${safeTitle}"`
    );

    // 6) Replace OG description
    result = result.replace(
      /<!--seo:og:description--><meta property="og:description" content="[^"]*"/,
      `<!--seo:og:description--><meta property="og:description" content="${safeDesc}"`
    );

    // 7) Replace OG URL
    result = result.replace(
      /<!--seo:og:url--><meta property="og:url" content="[^"]*"/,
      `<!--seo:og:url--><meta property="og:url" content="${escapeHtml(canonicalUrl)}"`
    );

    // 8) Replace Twitter title
    result = result.replace(
      /<!--seo:twitter:title--><meta name="twitter:title" content="[^"]*"/,
      `<!--seo:twitter:title--><meta name="twitter:title" content="${safeTitle}"`
    );

    // 9) Replace Twitter description
    result = result.replace(
      /<!--seo:twitter:description--><meta name="twitter:description" content="[^"]*"/,
      `<!--seo:twitter:description--><meta name="twitter:description" content="${safeDesc}"`
    );
  } else {
    // No per-route meta — just replace __SITE_URL__ (already done above)
  }

  return result;
}
