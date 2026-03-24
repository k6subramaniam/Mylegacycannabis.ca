/**
 * Shared helper to build a full user response with orders, ID verification, and rewards.
 * Used across auth.me, loginEmail, register, OTP verify, and store.refreshUser.
 */
import * as db from "./db";

export async function buildFullUserResponse(user: NonNullable<Awaited<ReturnType<typeof db.getUserByEmail>>>) {
  // Fetch orders
  const userOrders = await db.getUserOrders(user.id);
  const formattedOrders = [];
  for (const o of userOrders) {
    const items = await db.getOrderItems(o.id);
    formattedOrders.push({
      id: o.orderNumber || `ORD-${o.id}`,
      date: o.createdAt?.toISOString?.() || new Date().toISOString(),
      status: o.status || 'processing',
      total: parseFloat((o as any).total || '0'),
      items: items.map((i: any) => ({
        name: i.productName || 'Item',
        quantity: i.quantity || 1,
        price: parseFloat(i.price || '0'),
      })),
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
    rewardsHistory: [],
    referralCode: '',
    orders: formattedOrders,
  };
}
