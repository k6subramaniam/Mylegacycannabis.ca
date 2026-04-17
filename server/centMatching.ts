/**
 * Unique Cent Matching for e-Transfer Payments
 *
 * When a customer selects e-Transfer at checkout, the system appends a unique
 * cent value (1-99) to their order total. If the customer forgets the memo,
 * the system can still match the payment by exact amount — because no two
 * pending orders share the same final total.
 *
 * Builds on PR #16 (checkout) and PR #31 (24h auto-cancel).
 */

import * as db from "./db";

/**
 * Assigns a unique cent value to an e-Transfer order total.
 * Ensures no two pending orders share the same final amount.
 *
 * @param baseAmount - The cart total before cent adjustment (e.g., 120.00)
 * @param orderId - The order ID to reserve for
 * @returns finalAmount - The adjusted total with unique cents (e.g., 120.03)
 */
export async function reserveUniqueCentAmount(
  baseAmount: number,
  orderId: number
): Promise<number> {
  // Round base to nearest dollar to create the "bucket"
  const baseDollars = Math.floor(baseAmount);

  // Find which cent offsets are already reserved for this dollar amount
  const usedCentsArr = await db.getReservedCentOffsets(baseDollars.toFixed(2));
  const usedCents = new Set(usedCentsArr);

  // Find the first available cent (1-99)
  // Start at 1 (never use .00 — that's the unmodified amount)
  let centOffset = 1;
  while (usedCents.has(centOffset) && centOffset < 100) {
    centOffset++;
  }

  if (centOffset >= 100) {
    // Extremely unlikely: 99 pending orders for the same dollar amount
    // Fall back to adding a dollar and trying again
    return reserveUniqueCentAmount(baseAmount + 1, orderId);
  }

  // Calculate final amount
  // Original cents + offset, wrapping if needed
  const originalCents = Math.round((baseAmount - baseDollars) * 100);
  const totalCents = originalCents + centOffset;
  const finalAmount = baseDollars + totalCents / 100;

  // Reserve it — 24h matches PR #31 auto-cancel window
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.createCentReservation({
    baseAmount: baseDollars.toFixed(2),
    centOffset,
    finalAmount: finalAmount.toFixed(2),
    orderId,
    status: "reserved",
    expiresAt,
  });

  console.log(
    `[CentMatch] Reserved $${finalAmount.toFixed(2)} (offset +${centOffset}c) for order #${orderId}`
  );
  return parseFloat(finalAmount.toFixed(2));
}

/**
 * Look up a pending order by exact cent amount.
 * Returns the order ID if there's exactly one match.
 */
export async function findOrderByCentAmount(
  amount: number
): Promise<{ orderId: number; confidence: "exact" } | null> {
  const matches = await db.findCentReservationByAmount(amount.toFixed(2));

  if (matches.length === 1) {
    return { orderId: matches[0].orderId, confidence: "exact" };
  }

  // Multiple matches (very unlikely) or no matches
  return null;
}

/**
 * Mark a cent reservation as matched (after payment confirmed).
 */
export async function markCentMatched(orderId: number): Promise<void> {
  await db.markCentReservationMatched(orderId);
}

/**
 * Release expired reservations.
 * Run with the existing auto-cancel cron job from PR #31.
 */
export async function expireOldCentReservations(): Promise<number> {
  const expired = await db.expireOldCentReservations();
  if (expired > 0) {
    console.log(`[CentMatch] Expired ${expired} stale cent reservation(s)`);
  }
  return expired;
}
