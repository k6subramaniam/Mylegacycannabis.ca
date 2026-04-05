/**
 * Centralized SEO configuration for My Legacy Cannabis.
 *
 * Single source of truth for:
 *  - SITE_URL (swap once when the custom domain is ready)
 *  - Per-route metadata (title, description, canonical suffix, ogType, noindex)
 *  - Structured-data helpers
 */

// ─── SINGLE SOURCE OF TRUTH ─────────────────────────────────
// Change this ONE line when the custom domain goes live.
export const SITE_URL = 'https://mylegacycannabisca-production.up.railway.app';
export const SITE_NAME = 'My Legacy Cannabis';
export const DEFAULT_OG_IMAGE = '/logo.webp';
export const PHONE = '+14372154722';
export const SUPPORT_EMAIL = 'support@mylegacycannabis.ca';

// ─── ROUTE METADATA ─────────────────────────────────────────
export interface RouteSEO {
  title: string;
  description: string;
  /** Path suffix appended to SITE_URL for canonical (e.g. '/shop') */
  canonicalPath: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
}

/**
 * Unique metadata for every public route.
 * Key = path from React Router (e.g. '/shop', '/rewards').
 */
export const ROUTE_SEO: Record<string, RouteSEO> = {
  '/': {
    title: 'My Legacy Cannabis — 24/7 Cannabis Dispensary | GTA & Ottawa',
    description:
      '24/7 cannabis dispensary with 5 GTA & Ottawa locations. Shop flower, edibles, vapes & more. Free shipping over $150 Canada-wide. No taxes on any order.',
    canonicalPath: '/',
  },
  '/shop': {
    title: 'Shop Cannabis Online — Flower, Edibles, Vapes & More',
    description:
      'Browse our full selection of premium cannabis products — flower, pre-rolls, edibles, vapes, concentrates, and accessories. Free shipping on orders over $150.',
    canonicalPath: '/shop',
  },
  '/rewards': {
    title: 'My Legacy Rewards — Loyalty Program | Earn Points Every Purchase',
    description:
      'Earn 1 point for every $1 spent at My Legacy Cannabis. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up. Birthday bonuses, referral rewards, and more.',
    canonicalPath: '/rewards',
  },
  '/locations': {
    title: 'Store Locations — 24/7 Cannabis Dispensaries in GTA & Ottawa',
    description:
      'Visit any of our 5 My Legacy Cannabis locations in Mississauga, Hamilton, Toronto (Queen St & Dundas), and Ottawa. Open 24/7 with free parking.',
    canonicalPath: '/locations',
  },
  '/about': {
    title: 'About Us — My Legacy Cannabis | Our Story & Mission',
    description:
      'Learn about My Legacy Cannabis — a 24/7 cannabis dispensary serving the GTA and Ottawa since 2020. Our mission, values, and commitment to premium cannabis products.',
    canonicalPath: '/about',
  },
  '/shipping': {
    title: 'Shipping Policy — Nationwide Cannabis Delivery Across Canada',
    description:
      'My Legacy Cannabis ships nationwide across Canada. Free shipping on orders over $150. Ontario $10, Quebec $12, Western Canada $15, Atlantic $18, Territories $25.',
    canonicalPath: '/shipping',
  },
  '/contact': {
    title: 'Contact Us — My Legacy Cannabis | Phone, Email & Locations',
    description:
      'Get in touch with My Legacy Cannabis. Contact us by phone at (437) 215-4722, email support@mylegacycannabis.ca, or visit any of our 5 locations. Open 24/7.',
    canonicalPath: '/contact',
  },
  '/faq': {
    title: 'FAQ — Frequently Asked Questions | My Legacy Cannabis',
    description:
      'Find answers to common questions about ordering, shipping, payment, ID verification, and the My Legacy Rewards program at My Legacy Cannabis.',
    canonicalPath: '/faq',
  },
  '/privacy-policy': {
    title: 'Privacy Policy — My Legacy Cannabis',
    description:
      'My Legacy Cannabis privacy policy. Learn how we collect, use, and protect your personal information in accordance with Canadian privacy laws.',
    canonicalPath: '/privacy-policy',
  },
  '/terms': {
    title: 'Terms & Conditions — My Legacy Cannabis',
    description:
      'My Legacy Cannabis terms and conditions of use. Read our policies on ordering, shipping, returns, age verification, and more.',
    canonicalPath: '/terms',
  },
  // ── noindex pages (auth, checkout, account) ──
  '/login': {
    title: 'Sign In — My Legacy Cannabis',
    description:
      'Sign in to your My Legacy Cannabis account to track orders, earn rewards, and shop premium cannabis.',
    canonicalPath: '/login',
    noindex: true,
  },
  '/register': {
    title: 'Create Account — My Legacy Cannabis',
    description:
      'Create your My Legacy Cannabis account to earn rewards, track orders, and get exclusive deals.',
    canonicalPath: '/register',
    noindex: true,
  },
  '/complete-profile': {
    title: 'Complete Your Profile — My Legacy Cannabis',
    description: 'Complete your My Legacy Cannabis profile to unlock all features.',
    canonicalPath: '/complete-profile',
    noindex: true,
  },
  '/cart': {
    title: 'Shopping Cart — My Legacy Cannabis',
    description: 'Review your cart and proceed to checkout at My Legacy Cannabis.',
    canonicalPath: '/cart',
    noindex: true,
  },
  '/checkout': {
    title: 'Checkout — My Legacy Cannabis',
    description: 'Complete your order at My Legacy Cannabis.',
    canonicalPath: '/checkout',
    noindex: true,
  },
  '/account': {
    title: 'My Account — My Legacy Cannabis',
    description:
      'Manage your My Legacy Cannabis account, orders, rewards, and profile settings.',
    canonicalPath: '/account',
    noindex: true,
  },
};

// ─── CATEGORY SEO ───────────────────────────────────────────
export const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  flower: {
    title: 'Cannabis Flower — Premium Buds | My Legacy Cannabis',
    description:
      'Shop premium cannabis flower at My Legacy Cannabis. Indica, Sativa, and Hybrid strains. Free shipping on orders over $150.',
  },
  'pre-rolls': {
    title: 'Pre-Rolls — Ready-to-Smoke Cannabis Joints | My Legacy Cannabis',
    description:
      'Shop pre-rolled joints and blunts at My Legacy Cannabis. Singles, multi-packs, and infused pre-rolls available.',
  },
  edibles: {
    title: 'Cannabis Edibles — Gummies, Chocolates & More | My Legacy Cannabis',
    description:
      'Shop cannabis edibles at My Legacy Cannabis. Gummies, chocolates, beverages, and baked goods. Precise dosing for every experience.',
  },
  vapes: {
    title: 'Vape Cartridges & Pens — Cannabis Vapes | My Legacy Cannabis',
    description:
      'Shop cannabis vape cartridges, disposable pens, and 510 carts at My Legacy Cannabis. Premium distillate and live resin options.',
  },
  concentrates: {
    title: 'Cannabis Concentrates — Shatter, Wax & Hash | My Legacy Cannabis',
    description:
      'Shop cannabis concentrates at My Legacy Cannabis. Shatter, wax, hash, live resin, and rosin. Premium extracts for experienced users.',
  },
  'ounce-deals': {
    title: 'Ounce Deals — Bulk Cannabis Savings | My Legacy Cannabis',
    description:
      'Save big with ounce deals at My Legacy Cannabis. Premium flower by the ounce at the best prices. Free shipping over $150.',
  },
  'shake-n-bake': {
    title: 'Shake & Bake — Budget Cannabis | My Legacy Cannabis',
    description:
      'Shop affordable shake and trim at My Legacy Cannabis. Perfect for edibles, joints, and budget-conscious consumers.',
  },
  accessories: {
    title: 'Cannabis Accessories — Papers, Pipes & Grinders | My Legacy Cannabis',
    description:
      'Shop cannabis accessories at My Legacy Cannabis. Rolling papers, pipes, grinders, bongs, and storage containers.',
  },
};

// ─── HELPERS ─────────────────────────────────────────────────

/** Build a full canonical URL from a path */
export function canonical(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Build an absolute OG image URL */
export function absoluteOgImage(img?: string): string {
  if (!img) return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  if (img.startsWith('http')) return img;
  return `${SITE_URL}${img}`;
}

/** Get SEO config for a route, with fallback */
export function getRouteSEO(path: string): RouteSEO {
  return (
    ROUTE_SEO[path] || {
      title: `${SITE_NAME} — 24/7 Cannabis Dispensary`,
      description:
        'Premium cannabis dispensary with 5 locations across the GTA and Ottawa. Shop flower, pre-rolls, edibles, and more.',
      canonicalPath: path,
    }
  );
}

/** Get SEO for a shop category page */
export function getCategorySEO(slug: string) {
  return CATEGORY_SEO[slug] || null;
}

// ─── BREADCRUMB HELPERS ──────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── ORGANIZATION JSON-LD (static, for index.html) ──────────
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE_URL}/#logo`,
      url: `${SITE_URL}/logo.webp`,
      width: 512,
      height: 286,
      caption: SITE_NAME,
    },
    description:
      '24/7 cannabis dispensary serving the Greater Toronto Area and Ottawa with premium flower, pre-rolls, edibles, vapes, and concentrates. Nationwide shipping across Canada.',
    telephone: PHONE,
    email: SUPPORT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '255 Dundas St W',
      addressLocality: 'Mississauga',
      addressRegion: 'ON',
      postalCode: 'L5B 1H4',
      addressCountry: 'CA',
    },
    sameAs: [SITE_URL],
    areaServed: { '@type': 'Country', name: 'Canada' },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  };
}

// ─── SERVER-SIDE META MAP ────────────────────────────────────
// Exported so the Express middleware can inject <title> + <meta description>
// into the raw HTML before sending it to bots (Googlebot, social crawlers).
export const SERVER_META_MAP: Record<string, { title: string; description: string }> = {};
for (const [path, seo] of Object.entries(ROUTE_SEO)) {
  const fullTitle = seo.title.includes(SITE_NAME)
    ? seo.title
    : `${seo.title} | ${SITE_NAME}`;
  SERVER_META_MAP[path] = { title: fullTitle, description: seo.description };
}
// Add categories
for (const [slug, seo] of Object.entries(CATEGORY_SEO)) {
  SERVER_META_MAP[`/shop/${slug}`] = { title: seo.title, description: seo.description };
}
