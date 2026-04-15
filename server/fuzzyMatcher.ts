/**
 * AI Fuzzy Matching for e-Transfer Payments
 *
 * Multi-factor scoring: name similarity (Levenshtein + nicknames),
 * amount proximity, time window, and customer uniqueness.
 *
 * Catches spouse sends, nickname variations, typos, and partial name matches.
 */

import * as db from "./db";

export interface FuzzyMatchResult {
  orderId: number;
  orderNumber: string;
  customerName: string;
  confidence: number; // 0.0 to 1.0
  reasons: string[]; // human-readable reasons
}

/**
 * Fuzzy match an e-transfer payment against pending orders.
 * Uses name similarity, amount proximity, and time window.
 */
export async function fuzzyMatchPayment(email: {
  senderName: string;
  amount: number;
  receivedAt: Date;
}): Promise<FuzzyMatchResult | null> {
  // Get all pending e-transfer orders from the last 48 hours (wider window than 24h for delayed sends)
  const pendingOrders = await db.getPendingETransferOrders();
  if (pendingOrders.length === 0) return null;

  const candidates: FuzzyMatchResult[] = [];

  for (const order of pendingOrders) {
    const reasons: string[] = [];
    let score = 0;

    // Factor 1: Name similarity (weight: 40%)
    const customerFullName = order.guestName || "";
    const nameSim = nameSimilarity(email.senderName, customerFullName);
    score += nameSim * 0.4;

    if (nameSim >= 0.7) {
      reasons.push(
        `Name match: "${email.senderName}" ~ "${customerFullName}" (${(nameSim * 100).toFixed(0)}%)`
      );
    }

    // Factor 2: Amount match (weight: 35%)
    const orderAmount = parseFloat(order.total);
    const amountDiff = Math.abs(orderAmount - email.amount);

    if (amountDiff === 0) {
      score += 0.35;
      reasons.push("Exact amount match");
    } else if (amountDiff <= 0.99) {
      // Within $1 — customer may have rounded
      score += 0.25;
      reasons.push(
        `Amount close: $${email.amount} vs $${orderAmount} (diff: $${amountDiff.toFixed(2)})`
      );
    } else if (amountDiff <= 5.0) {
      score += 0.1;
      reasons.push(`Amount approximate: $${email.amount} vs $${orderAmount}`);
    }

    // Factor 3: Time proximity (weight: 15%)
    const hoursSinceOrder =
      (email.receivedAt.getTime() - new Date(order.createdAt).getTime()) /
      (1000 * 60 * 60);

    if (hoursSinceOrder >= 0 && hoursSinceOrder <= 2) {
      score += 0.15;
      reasons.push("Payment within 2h of order");
    } else if (hoursSinceOrder > 0 && hoursSinceOrder <= 6) {
      score += 0.1;
      reasons.push("Payment within 6h of order");
    } else if (hoursSinceOrder > 0 && hoursSinceOrder <= 24) {
      score += 0.05;
      reasons.push("Payment within 24h of order");
    }

    // Factor 4: Only pending order for this customer (weight: 10%)
    const otherPending = pendingOrders.filter(
      o => o.userId === order.userId && o.id !== order.id
    );
    if (otherPending.length === 0) {
      score += 0.1;
      reasons.push("Only pending order for this customer");
    }

    if (reasons.length > 0) {
      candidates.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: customerFullName,
        confidence: Math.min(1, score),
        reasons,
      });
    }
  }

  // Return the highest confidence match
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] || null;
}

// Name Similarity Functions

/**
 * Calculate similarity between two names.
 * Handles: nicknames, reversed order, typos, spouse names.
 */
function nameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact match after normalization
  if (n1 === n2) return 1.0;

  // Check if last names match (strong signal even if first names differ — spouse scenario)
  const parts1 = n1.split(" ");
  const parts2 = n2.split(" ");
  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];

  if (lastName1 === lastName2 && lastName1.length >= 3) {
    // Same last name — check first name similarity
    const firstName1 = parts1.slice(0, -1).join(" ");
    const firstName2 = parts2.slice(0, -1).join(" ");

    if (isNickname(firstName1, firstName2)) return 0.9;

    const firstNameSim = levenshteinSimilarity(firstName1, firstName2);
    // Last name match + some first name similarity
    return 0.6 + firstNameSim * 0.4;
  }

  // Check reversed name order ("Smith John" vs "John Smith")
  const reversed1 = [...parts1].reverse().join(" ");
  if (reversed1 === n2) return 0.95;

  // General Levenshtein similarity
  return levenshteinSimilarity(n1, n2);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // remove non-alpha
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Levenshtein distance-based similarity (0.0 to 1.0).
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Common nickname mappings for Canadian names.
 */
const NICKNAMES: Record<string, string[]> = {
  matthew: ["matt", "matty", "mathew"],
  elizabeth: ["liz", "lizzy", "beth", "eliza", "betty"],
  michael: ["mike", "mikey", "mick"],
  william: ["will", "bill", "billy", "willy", "liam"],
  robert: ["rob", "bob", "bobby", "robbie", "bert"],
  jennifer: ["jen", "jenny", "jenn"],
  katherine: ["kate", "kathy", "cathy", "katie", "kat"],
  christopher: ["chris", "topher", "kit"],
  alexander: ["alex", "al", "xander"],
  margaret: ["maggie", "peggy", "meg", "marge"],
  nicholas: ["nick", "nicky", "nic"],
  james: ["jim", "jimmy", "jamie"],
  benjamin: ["ben", "benny", "benji"],
  daniel: ["dan", "danny"],
  joseph: ["joe", "joey"],
  david: ["dave", "davey"],
  richard: ["rick", "dick", "rich", "richie"],
  thomas: ["tom", "tommy"],
  patricia: ["pat", "patty", "trish"],
  jonathan: ["jon", "jonny", "nathan"],
  timothy: ["tim", "timmy"],
  samantha: ["sam", "sammy"],
  andrew: ["andy", "drew"],
  anthony: ["tony", "ant"],
  joshua: ["josh"],
  victoria: ["vicky", "tori", "vic"],
  mohammad: ["muhammad", "mohammed", "mohamed", "mohamad"],
  priya: ["priyanka"],
  raj: ["rajesh", "rajan"],
  subramaniam: ["subra", "subbu"],
  stephanie: ["steph"],
  jessica: ["jess", "jessie"],
  rebecca: ["becca", "becky"],
  catherine: ["cat", "cath", "cathy", "kate", "katie"],
  natalie: ["nat", "nattie"],
  nathaniel: ["nate", "nat"],
  zachary: ["zach", "zack"],
  peter: ["pete"],
  steven: ["steve"],
  edward: ["ed", "eddie", "ted", "teddy"],
  philip: ["phil"],
  charles: ["charlie", "chuck"],
  gregory: ["greg"],
  lawrence: ["larry"],
  raymond: ["ray"],
  donald: ["don", "donnie"],
  kenneth: ["ken", "kenny"],
  ronald: ["ron", "ronnie"],
  gerald: ["gerry", "jerry"],
};

function isNickname(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  for (const [formal, nicks] of Object.entries(NICKNAMES)) {
    const allVariants = [formal, ...nicks];
    if (allVariants.includes(n1) && allVariants.includes(n2)) return true;
  }

  // Check if one name starts with the other (e.g., "Rob" -> "Robert")
  if (n1.length >= 3 && n2.startsWith(n1)) return true;
  if (n2.length >= 3 && n1.startsWith(n2)) return true;

  return false;
}
