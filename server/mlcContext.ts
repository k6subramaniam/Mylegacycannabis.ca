/**
 * MLC Business Context — shared knowledge base for all AI features.
 *
 * This module provides comprehensive business context that is injected into
 * every AI system prompt across the platform (email generation, menu import,
 * product descriptions, future chat/support features).
 *
 * Update this file when business details change (locations, hours, policies, etc.).
 */

// ─── Core Business Identity ───

export const MLC_BUSINESS = {
  name: "My Legacy Cannabis",
  shortName: "MLC",
  tagline: "GTA's Premier Cannabis Delivery",
  founded: "2024",
  website: "https://mylegacycannabis.ca",
  supportEmail: "support@mylegacycannabis.ca",
  paymentEmail: "k6bramaniam@gmail.com",
  phone: "(437) 215-4722",
} as const;

// ─── Store Locations ───

export const MLC_LOCATIONS = [
  {
    name: "Mississauga",
    address: "255 Dundas St W, Mississauga, ON L5B 1H4",
    phone: "(437) 215-4722",
    hours: "Open 24/7",
  },
  {
    name: "Hamilton",
    address: "123 King St E, Hamilton, ON L8N 1A9",
    phone: "(905) 555-0123",
    hours: "Open 24/7",
  },
  {
    name: "Queen St Toronto",
    address: "456 Queen St W, Toronto, ON M5V 2A8",
    phone: "(416) 555-0456",
    hours: "Open 24/7",
  },
  {
    name: "Dundas Toronto",
    address: "789 Dundas St W, Toronto, ON M6J 1V1",
    phone: "(416) 555-0789",
    hours: "Open 24/7",
  },
  {
    name: "Merivale Ottawa",
    address: "1642 Merivale Rd, Ottawa, ON K2G 4A1",
    phone: "(613) 555-0164",
    hours: "Open 24/7",
  },
] as const;

// ─── Product Categories & Grading System ───

export const MLC_PRODUCT_INFO = {
  categories: [
    "Flower (Indica, Sativa, Hybrid)",
    "Pre-Rolls (singles, packs, infused)",
    "Edibles (gummies, chocolates, beverages)",
    "Vapes (cartridges, disposables)",
    "Concentrates (live resin, shatter, diamonds, hash)",
    "Ounce Deals (28g bulk at discounted rates)",
    "Shake n Bake (budget-friendly shake)",
    "Accessories (grinders, pipes, batteries, papers)",
  ],
  gradingSystem: {
    description: "Products are graded by quality from highest to lowest",
    grades: [
      {
        grade: "AAAA",
        label: "Quad",
        description:
          "Top-shelf, premium craft cannabis. Exceptional trichome coverage, perfect cure, complex terpene profiles.",
      },
      {
        grade: "AAA+",
        label: "Trip-A Plus",
        description:
          "Near-quad quality. Dense nugs, excellent potency, strong flavour.",
      },
      {
        grade: "AAA",
        label: "Trip-A",
        description:
          "High-quality flower. Great for daily use with solid effects.",
      },
      {
        grade: "AAA-",
        label: "Trip-A Minus",
        description: "Above-average quality at value pricing.",
      },
      {
        grade: "AA+",
        label: "Double-A Plus",
        description: "Good quality, great value. Reliable effects.",
      },
      {
        grade: "AA",
        label: "Double-A",
        description: "Budget-friendly option with decent quality.",
      },
      {
        grade: "SHAKE",
        label: "Shake",
        description:
          "Small buds and trim. Perfect for edibles, joints, or bowls at the lowest price.",
      },
    ],
  },
  weightOptions: [
    "1g",
    "3.5g (eighth)",
    "7g (quarter)",
    "14g (half oz)",
    "28g (full oz)",
  ],
  strainTypes: [
    "Indica (relaxing, body-focused)",
    "Sativa (energizing, cerebral)",
    "Hybrid (balanced)",
    "CBD (minimal THC)",
  ],
} as const;

// ─── Business Policies ───

export const MLC_POLICIES = {
  payment:
    "Interac e-Transfer only. Payment is sent to the payment email provided in the order confirmation. An auto-deposit reference code is given at checkout.",
  shipping: {
    carrier: "Canada Post",
    freeThreshold: "$150",
    minimumOrder: "$40",
    estimatedDelivery:
      "2-5 business days within Ontario, 4-8 for rest of Canada",
    zones:
      "Ontario ($10), Quebec ($12), Western Canada ($15), Atlantic ($18), Northern Territories ($25)",
  },
  ageVerification:
    "All customers must be 19+ (Ontario legal age). ID verification may be required before order processing.",
  rewards:
    "1 point per $1 spent. Points redeemable at checkout. Welcome bonus: 25 points. Referral bonus: 50 points.",
  returns:
    "No returns on cannabis products due to federal regulations. Damaged or incorrect orders are replaced at no cost.",
  hours:
    "Online orders accepted 24/7. Customer support available 10 AM – 10 PM daily.",
} as const;

// ─── Brand Voice & Style Guide ───

export const MLC_BRAND = {
  voice: [
    "Bold — confident, direct communication",
    "Accessible — jargon-free, welcoming to newcomers",
    "Premium — quality-focused, never cheap-sounding",
    "Community-Rooted — locally owned GTA business, neighbourhood feel",
    "Modern — clean, contemporary, tech-forward",
  ],
  colorPalette: {
    primaryPurple: "#4B2DBE",
    secondaryPurple: "#3A2270",
    accentOrange: "#F19929",
    charcoal: "#323233",
    lightGray: "#F5F5F5",
    white: "#FFFFFF",
  },
  typography: {
    headings: "Bungee (display font)",
    body: "Roboto (Light, Regular, Medium, Bold)",
    data: "Roboto Mono",
  },
  toneGuidelines: [
    "Always address the customer by name when available",
    "Use action-oriented language (e.g., 'Get started', 'Shop now', 'Track your order')",
    "Never use slang or stoner culture stereotypes",
    "Keep emails concise — customers scan, they don't read novels",
    "Be transparent about order status, shipping times, and policies",
    "End customer-facing communications with a support contact",
  ],
} as const;

// ─── Compiled Context String ───

/**
 * Returns a comprehensive business context block suitable for injection
 * into any AI system prompt. This ensures all AI features across the
 * platform share consistent, accurate knowledge about the business.
 */
export function getMlcBusinessContext(): string {
  return `
BUSINESS: ${MLC_BUSINESS.name} (${MLC_BUSINESS.shortName}) — ${MLC_BUSINESS.tagline}
Website: ${MLC_BUSINESS.website}
Support: ${MLC_BUSINESS.supportEmail} | Phone: ${MLC_BUSINESS.phone}
Founded: ${MLC_BUSINESS.founded}

LOCATIONS (5 stores across the GTA):
${MLC_LOCATIONS.map(l => `  - ${l.name}: ${l.address} | ${l.phone} | ${l.hours}`).join("\n")}

SERVICE AREA: Greater Toronto Area (GTA) with Canada-wide shipping via Canada Post.

PRODUCT CATEGORIES:
${MLC_PRODUCT_INFO.categories.map(c => `  - ${c}`).join("\n")}

GRADING SYSTEM (${MLC_PRODUCT_INFO.gradingSystem.description}):
${MLC_PRODUCT_INFO.gradingSystem.grades.map(g => `  - ${g.grade} (${g.label}): ${g.description}`).join("\n")}

WEIGHT OPTIONS: ${MLC_PRODUCT_INFO.weightOptions.join(", ")}
STRAIN TYPES: ${MLC_PRODUCT_INFO.strainTypes.join(", ")}

PAYMENT: ${MLC_POLICIES.payment}
SHIPPING: ${MLC_POLICIES.shipping.carrier} | Free over ${MLC_POLICIES.shipping.freeThreshold} | Min order ${MLC_POLICIES.shipping.minimumOrder} | ${MLC_POLICIES.shipping.estimatedDelivery}
AGE VERIFICATION: ${MLC_POLICIES.ageVerification}
REWARDS: ${MLC_POLICIES.rewards}
HOURS: ${MLC_POLICIES.hours}

BRAND VOICE: ${MLC_BRAND.voice.join("; ")}
TONE: ${MLC_BRAND.toneGuidelines.join(". ")}

BRAND COLORS: Primary Purple ${MLC_BRAND.colorPalette.primaryPurple}, Secondary Purple ${MLC_BRAND.colorPalette.secondaryPurple}, Accent Orange ${MLC_BRAND.colorPalette.accentOrange}, Charcoal ${MLC_BRAND.colorPalette.charcoal}
`.trim();
}

/**
 * Returns a shorter context block for prompts with tighter token budgets
 * (e.g., menu image parsing where most tokens go to image analysis).
 */
export function getMlcContextBrief(): string {
  return `Business: ${MLC_BUSINESS.name} — ${MLC_BUSINESS.tagline}.
Locations: ${MLC_LOCATIONS.map(l => l.name).join(", ")}.
Categories: Flower, Pre-Rolls, Edibles, Vapes, Concentrates, Ounce Deals, Shake n Bake, Accessories.
Grades: AAAA (top), AAA+, AAA, AAA-, AA+, AA, SHAKE (budget).
Weights: 1g, 3.5g, 7g, 14g, 28g.
Payment: Interac e-Transfer. Shipping: Canada Post. Free over $150. Min $40.
Brand: Bold, Premium, Community-Rooted. Colors: Purple #4B2DBE, Orange #F19929.`.trim();
}
