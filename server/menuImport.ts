/**
 * Menu Import — parse a cannabis menu image using AI vision,
 * return structured product data, and bulk-import into the DB.
 *
 * Flow:
 *   1. Admin uploads photo of menu → parseMenuImage()
 *   2. GPT vision extracts every strain, grade, THC, prices
 *   3. Admin reviews preview table, sets stock quantities
 *   4. Admin clicks "Import" → applyMenuImport()
 *   5. Old flower products are deactivated, new ones created/updated
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as db from "./db";

// ─── OpenAI client (reads from GenSpark config) ───

function getOpenAIClient(): OpenAI {
  let apiKey = process.env.OPENAI_API_KEY;
  let baseURL = process.env.OPENAI_BASE_URL;

  // Try ~/.genspark_llm.yaml as fallback
  if (!apiKey) {
    try {
      const configPath = path.join(require("os").homedir(), ".genspark_llm.yaml");
      if (fs.existsSync(configPath)) {
        const config = yaml.load(fs.readFileSync(configPath, "utf8")) as any;
        apiKey = config?.openai?.api_key || apiKey;
        baseURL = config?.openai?.base_url || baseURL;
      }
    } catch {}
  }

  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  return new OpenAI({ apiKey, baseURL });
}

// ─── Types ───

export interface ParsedMenuItem {
  category: string;     // "Indica Flower", "Sativa Flower", "Hybrid Flower", "Ounce Deals", "Shake n Bake"
  grade: string;        // "AAAA", "AAA+", "AAA", "AAA-", "AA+", "AA", "SHAKE"
  strain: string;       // e.g. "PINK TACO"
  thc: string;          // e.g. "29-33%"
  isNew: boolean;
  prices: {
    "1g"?: string | null;
    "3.5g"?: string | null;
    "7g"?: string | null;
    "14g"?: string | null;
    "28g"?: string | null;
  };
}

export interface MenuImportPayload {
  items: Array<ParsedMenuItem & {
    stock: number;         // Admin sets this before import
    include: boolean;      // Admin can exclude items
  }>;
  deactivateOldFlower: boolean;   // Deactivate flower products not in this import
  defaultStock: number;           // Default stock for all items
}

// ─── Vision parsing ───

const MENU_PARSE_PROMPT = `You are a cannabis menu data extractor. Analyze this menu image and extract EVERY product into a JSON array.

For each product extract:
- "category": one of "Indica Flower", "Sativa Flower", "Hybrid Flower", "Ounce Deals", "Shake n Bake"
- "grade": the quality grade exactly as shown (e.g. "AAAA", "AAA+", "AAA", "AAA-", "AA+", "AA", "SHAKE")
- "strain": the strain name in UPPERCASE exactly as shown
- "thc": the THC percentage range as shown (e.g. "29-33%")
- "isNew": true if the strain is marked as "(NEW)", false otherwise
- "prices": object with keys "1g", "3.5g", "7g", "14g", "28g". Use the dollar amount as string (e.g. "$15") or null if N/A.

IMPORTANT: 
- Extract EVERY strain from EVERY category (Indica, Sativa, Hybrid, Ounce Deals, Shake n Bake).
- In the menu, multiple strains in the same grade share the same prices. Apply the grade's prices to each individual strain.
- Return ONLY a valid JSON array, no markdown, no explanation.

Example output format:
[
  {"category":"Indica Flower","grade":"AAAA","strain":"PINK TACO","thc":"29-33%","isNew":false,"prices":{"1g":"$15","3.5g":"$45","7g":"$70","14g":"$125","28g":"$230"}},
  {"category":"Sativa Flower","grade":"AAA","strain":"VANILLA LIME","thc":"25-27%","isNew":false,"prices":{"1g":null,"3.5g":"$20","7g":"$50","14g":"$70","28g":"$139"}}
]`;

export async function parseMenuImage(base64Image: string, mimeType: string = "image/png"): Promise<ParsedMenuItem[]> {
  const client = getOpenAIClient();

  console.log("[MenuImport] Sending image to GPT vision for parsing...");
  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: MENU_PARSE_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 8000,
    temperature: 0.1,
  });

  const raw = response.choices?.[0]?.message?.content || "";
  const latency = Date.now() - startTime;
  console.log(`[MenuImport] GPT response received in ${latency}ms (${raw.length} chars)`);

  // Parse JSON from response (may be wrapped in ```json ... ```)
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let items: ParsedMenuItem[];
  try {
    items = JSON.parse(jsonStr);
  } catch (err: any) {
    console.error("[MenuImport] Failed to parse GPT response as JSON:", raw.substring(0, 500));
    throw new Error(`AI returned invalid JSON. Please try again. Parse error: ${err.message}`);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("AI did not find any products in the image. Please upload a clear menu photo.");
  }

  // Validate and normalize
  items = items.map(item => ({
    category: item.category || "Hybrid Flower",
    grade: item.grade || "AAA",
    strain: (item.strain || "").toUpperCase().trim(),
    thc: item.thc || "",
    isNew: Boolean(item.isNew),
    prices: {
      "1g": normPrice(item.prices?.["1g"]),
      "3.5g": normPrice(item.prices?.["3.5g"]),
      "7g": normPrice(item.prices?.["7g"]),
      "14g": normPrice(item.prices?.["14g"]),
      "28g": normPrice(item.prices?.["28g"]),
    },
  }));

  console.log(`[MenuImport] Parsed ${items.length} products from menu image`);
  return items;
}

function normPrice(p: any): string | null {
  if (!p || p === "N/A" || p === "n/a" || p === "null") return null;
  if (typeof p === "string") return p.startsWith("$") ? p : `$${p}`;
  return null;
}

// ─── Map category to DB fields ───

function mapCategory(menuCategory: string): { category: "flower"; strainType: "Indica" | "Sativa" | "Hybrid" } {
  const cat = menuCategory.toLowerCase();
  if (cat.includes("indica")) return { category: "flower", strainType: "Indica" };
  if (cat.includes("sativa")) return { category: "flower", strainType: "Sativa" };
  return { category: "flower", strainType: "Hybrid" };
}

function makeSlug(strain: string, weight: string): string {
  return `${strain}-${weight}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Pick the "primary" weight option for display price (preferring 3.5g, then 7g, 14g, 28g, 1g)
 */
function primaryPrice(prices: ParsedMenuItem["prices"]): { weight: string; price: string } {
  const pref = ["3.5g", "7g", "14g", "28g", "1g"] as const;
  for (const w of pref) {
    if (prices[w]) return { weight: w, price: prices[w]! };
  }
  return { weight: "3.5g", price: "$0" };
}

// ─── Apply import ───

export async function applyMenuImport(payload: MenuImportPayload): Promise<{
  created: number;
  updated: number;
  deactivated: number;
  skipped: number;
}> {
  const { items, deactivateOldFlower, defaultStock } = payload;
  const included = items.filter(i => i.include);
  let created = 0, updated = 0, deactivated = 0, skipped = 0;

  // Get all existing flower products for matching
  const existingProducts = await db.getAllProducts({ page: 1, limit: 1000, activeOnly: false });
  const existingFlower = existingProducts.data.filter((p: any) => p.category === "flower");

  // Track which existing products were matched (to know which to deactivate)
  const matchedIds = new Set<number>();

  for (const item of included) {
    const { category, strainType } = mapCategory(item.category);
    const stock = item.stock ?? defaultStock ?? 10;

    // Get all weight tiers with prices
    const weightPrices = Object.entries(item.prices)
      .filter(([_, price]) => price !== null && price !== undefined)
      .map(([weight, price]) => ({ weight, price: price!.replace("$", "") }));

    if (weightPrices.length === 0) {
      skipped++;
      continue;
    }

    // Create one product per weight tier (e.g. "PINK TACO — 3.5g", "PINK TACO — 28g")
    for (const { weight, price } of weightPrices) {
      const name = `${titleCase(item.strain)} — ${weight}`;
      const slug = makeSlug(item.strain, weight);
      const shortDesc = `${item.grade} Grade ${strainType} | THC: ${item.thc} | ${weight}`;
      const description = `${titleCase(item.strain)} is a ${item.grade}-grade ${strainType.toLowerCase()} strain with ${item.thc} THC. Available in ${weight} size. Grade: ${item.grade}. ${item.isNew ? "NEW arrival!" : ""}`.trim();

      // Check if this exact slug already exists
      const existing = existingFlower.find((p: any) => p.slug === slug);

      if (existing) {
        // Update existing product
        matchedIds.add(existing.id);
        await db.updateProduct(existing.id, {
          name,
          price,
          thc: item.thc,
          weight,
          strainType,
          shortDescription: shortDesc,
          description,
          stock,
          isNew: item.isNew,
          isActive: true,
          flavor: item.grade, // Store grade in flavor field for display
        } as any);
        updated++;
      } else {
        // Create new product
        const newId = await db.createProduct({
          name,
          slug,
          category,
          strainType,
          price,
          weight,
          thc: item.thc,
          description,
          shortDescription: shortDesc,
          stock,
          featured: item.grade === "AAAA" || item.grade === "AAA+",
          isNew: item.isNew,
          isActive: true,
          flavor: item.grade, // Store grade in flavor field
        } as any);
        if (newId) matchedIds.add(newId);
        created++;
      }
    }
  }

  // Deactivate flower products that weren't in this import
  if (deactivateOldFlower) {
    for (const product of existingFlower) {
      if (!matchedIds.has(product.id) && product.isActive) {
        await db.updateProduct(product.id, { isActive: false } as any);
        deactivated++;
      }
    }
  }

  console.log(`[MenuImport] Done: ${created} created, ${updated} updated, ${deactivated} deactivated, ${skipped} skipped`);
  return { created, updated, deactivated, skipped };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
