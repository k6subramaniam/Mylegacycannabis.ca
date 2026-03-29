/**
 * Shared helper to build a full user response with orders, ID verification, and rewards.
 * Used across auth.me, loginEmail, register, OTP verify, and store.refreshUser.
 */
import * as db from "./db";
import { nanoid } from "nanoid";

export async function buildFullUserResponse(user: NonNullable<Awaited<ReturnType<typeof db.getUserByEmail>>>) {
  // Fetch orders
  const userOrders = await db.getUserOrders(user.id);
  const formattedOrders = [];
  for (const o of userOrders) {
    const items = await db.getOrderItems(o.id);
    const formattedItems = [];
    for (const i of items) {
      let productSlug: string | undefined;
      if ((i as any).productId) {
        try {
          const product = await db.getProductById((i as any).productId);
          if (product) productSlug = product.slug;
        } catch { /* product may have been deleted */ }
      }
      formattedItems.push({
        name: (i as any).productName || 'Item',
        quantity: (i as any).quantity || 1,
        price: parseFloat((i as any).price || '0'),
        productId: (i as any).productId || null,
        productSlug: productSlug || null,
      });
    }
    formattedOrders.push({
      id: o.orderNumber || `ORD-${o.id}`,
      date: o.createdAt?.toISOString?.() || new Date().toISOString(),
      status: o.status || 'processing',
      total: parseFloat((o as any).total || '0'),
      items: formattedItems,
      trackingNumber: (o as any).trackingNumber || undefined,
    });
  }

  // Determine idVerificationStatus
  const idVerifEnabled = await db.isIdVerificationEnabled();
  let idVerificationStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
  if (!idVerifEnabled) {
    idVerificationStatus = 'approved';
  } else if (user.idVerified) {
    idVerificationStatus = 'approved';
  } else {
    const verifications = await db.getAllVerifications({ email: user.email || '', limit: 1 });
    if (verifications.data.length > 0) {
      const latest = verifications.data[0];
      if (latest.status === 'approved') {
        idVerificationStatus = 'approved';
        await db.updateUser(user.id, { idVerified: true });
      } else if (latest.status === 'pending') {
        idVerificationStatus = 'pending';
      } else if (latest.status === 'rejected') {
        idVerificationStatus = 'rejected';
      }
    }
  }

  // ─── REWARDS HISTORY (from DB) ───
  let rewardsHistory: { id: string; date: string; type: string; points: number; description: string }[] = [];
  try {
    const history = await db.getRewardsHistoryByUser(user.id);
    rewardsHistory = (history || []).map((h: any) => ({
      id: `rh-${h.id}`,
      date: h.createdAt?.toISOString?.() || new Date().toISOString(),
      type: h.type || 'earned',
      points: h.points || 0,
      description: h.description || '',
    }));
  } catch (err) {
    console.warn('[buildFullUserResponse] Failed to fetch rewards history:', err);
  }

  // ─── REFERRAL CODE (fetch or auto-generate) ───
  let referralCode = '';
  try {
    let refRecord = await db.getReferralCodeByUserId(user.id);
    if (!refRecord) {
      const code = `MLC-${nanoid(6).toUpperCase()}`;
      await db.createReferralCode({ userId: user.id, code } as any);
      refRecord = await db.getReferralCodeByUserId(user.id);
    }
    referralCode = refRecord?.code || '';
  } catch (err) {
    console.warn('[buildFullUserResponse] Failed to fetch referral code:', err);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    birthday: user.birthday,
    role: user.role || 'user',
    idVerified: !idVerifEnabled || user.idVerified || idVerificationStatus === 'approved',
    idVerificationStatus,
    rewardsPoints: user.rewardPoints || 0,
    rewardsHistory,
    referralCode,
    orders: formattedOrders,
  };
}
