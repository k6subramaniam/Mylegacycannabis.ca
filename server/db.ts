/**
 * In-memory data store replacing MySQL for sandbox environment.
 * All data is stored in memory and seeded with realistic sample data.
 */

import type {
  InsertUser,
  User,
  InsertProduct,
  Product,
  InsertOrder,
  Order,
  InsertOrderItem,
  InsertIdVerification,
  InsertShippingZone,
  InsertEmailTemplate,
  InsertAdminActivityLog,
  InsertRewardsHistory,
  InsertVerificationCode,
} from "../drizzle/schema";

// ─── ID COUNTER ───
let _nextId = 1;
function nextId() { return _nextId++; }

// ─── IN-MEMORY TABLES ───
const _users: User[] = [];
const _products: Product[] = [];
const _orders: Order[] = [];
const _orderItems: any[] = [];
const _idVerifications: any[] = [];
const _shippingZones: any[] = [];
const _emailTemplates: any[] = [];
const _adminActivityLog: any[] = [];
const _rewardsHistory: any[] = [];
const _verificationCodes: any[] = [];

// ─── GETDB STUB (for backward compat) ───
export async function getDb(): Promise<null> { return null; }

// ─── SEED DATA ───
function seedData() {
  const now = new Date();

  // Seed products
  const products = [
    { name: 'Purple Kush', slug: 'purple-kush', category: 'flower', strainType: 'Indica', price: '35.00', weight: '3.5g', thc: '22-26%', description: 'Purple Kush is a pure indica strain with earthy, sweet Kush aroma. Blissful, long-lasting euphoria blankets the mind while physical relaxation rids the body of pain, insomnia, and stress.', shortDescription: 'Pure indica with earthy, sweet Kush aroma. Deeply relaxing.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 50, featured: true, isNew: false, isActive: true, flavor: 'Earthy & Sweet' },
    { name: 'Blue Dream', slug: 'blue-dream', category: 'flower', strainType: 'Hybrid', price: '38.00', weight: '3.5g', thc: '21-28%', description: 'Blue Dream is a sativa-dominant hybrid originating in California. Crossing a Blueberry indica with Haze, Blue Dream balances full-body relaxation with gentle cerebral invigoration.', shortDescription: 'Legendary hybrid — blueberry aroma with balanced effects.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 40, featured: true, isNew: true, isActive: true, flavor: 'Blueberry & Haze' },
    { name: 'OG Kush', slug: 'og-kush', category: 'flower', strainType: 'Hybrid', price: '40.00', weight: '3.5g', thc: '20-25%', description: 'OG Kush is a legendary strain with a complex aroma featuring notes of fuel, skunk, and spice. Delivers a heavy, balanced high.', shortDescription: 'Legendary hybrid with fuel and spice aroma.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 35, featured: false, isNew: false, isActive: true, flavor: 'Fuel & Spice' },
    { name: 'Pink Kush', slug: 'pink-kush', category: 'flower', strainType: 'Indica', price: '45.00', weight: '3.5g', thc: '25-30%', description: 'Pink Kush is a potent indica-dominant strain with a sweet, floral aroma with vanilla undertones. Known for crushing stress and pain.', shortDescription: 'Potent indica with sweet vanilla and floral notes.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 30, featured: true, isNew: false, isActive: true, flavor: 'Sweet & Vanilla' },
    { name: 'Wedding Cake', slug: 'wedding-cake', category: 'flower', strainType: 'Hybrid', price: '42.00', weight: '3.5g', thc: '24-27%', description: 'Wedding Cake is a potent indica-hybrid with rich and tangy earthy pepper undertones. Delivers relaxing euphoria.', shortDescription: 'Rich, tangy hybrid with relaxing euphoria.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 25, featured: false, isNew: false, isActive: true, flavor: 'Vanilla & Pepper' },
    { name: 'Gelato', slug: 'gelato', category: 'flower', strainType: 'Hybrid', price: '44.00', weight: '3.5g', thc: '20-25%', description: 'Gelato is a hybrid made from Sunset Sherbet and Thin Mint Girl Scout Cookies. Produces euphoric highs with strong relaxation.', shortDescription: 'Sweet, fruity hybrid with euphoric relaxation.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 45, featured: true, isNew: true, isActive: true, flavor: 'Sweet & Fruity' },
    { name: 'Indica Pre-Roll Pack', slug: 'indica-pre-roll-pack', category: 'pre-rolls', strainType: 'Indica', price: '25.00', weight: '3x0.5g', thc: '20-24%', description: 'Three perfectly rolled 0.5g indica joints. Smooth, slow-burning, and ready to enjoy.', shortDescription: 'Three 0.5g indica joints — smooth and slow-burning.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 60, featured: true, isNew: false, isActive: true, flavor: 'Earthy & Pine' },
    { name: 'Sativa Pre-Roll Pack', slug: 'sativa-pre-roll-pack', category: 'pre-rolls', strainType: 'Sativa', price: '25.00', weight: '3x0.5g', thc: '22-26%', description: 'Three energizing sativa pre-rolls, perfect for daytime use.', shortDescription: 'Three 0.5g sativa joints — energizing and uplifting.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 55, featured: false, isNew: false, isActive: true, flavor: 'Citrus & Tropical' },
    { name: 'Infused Pre-Roll King', slug: 'infused-pre-roll-king', category: 'pre-rolls', strainType: 'Hybrid', price: '18.00', weight: '1g', thc: '35-40%', description: 'A premium 1g king-size pre-roll infused with live resin concentrate and rolled in kief. Expect powerful, long-lasting effects.', shortDescription: 'King-size infused joint — live resin + kief. Extremely potent.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 40, featured: true, isNew: true, isActive: true, flavor: 'Gassy & Sweet' },
    { name: 'Mixed Fruit Gummies', slug: 'mixed-fruit-gummies', category: 'edibles', strainType: 'Hybrid', price: '15.00', weight: '10 pieces', thc: '10mg/pack', description: 'Delicious mixed fruit gummies infused with 10mg THC total (1mg per gummy). Perfect for micro-dosing.', shortDescription: 'Mixed fruit gummies — 10mg THC total, 10 pieces.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 100, featured: true, isNew: false, isActive: true, flavor: 'Mixed Fruit' },
    { name: 'Dark Chocolate Bar', slug: 'dark-chocolate-bar', category: 'edibles', strainType: 'Indica', price: '12.00', weight: '1 bar', thc: '10mg/bar', description: 'Rich dark chocolate bar infused with 10mg THC. Divided into 10 squares for easy dosing.', shortDescription: 'Dark chocolate bar — 10mg THC, 10 breakable squares.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 60, featured: false, isNew: false, isActive: true, flavor: 'Dark Chocolate' },
    { name: 'THC Lemonade', slug: 'thc-lemonade', category: 'edibles', strainType: 'Hybrid', price: '8.00', weight: '355ml', thc: '10mg/bottle', description: 'Refreshing cannabis-infused lemonade with 10mg THC per bottle. Crisp, tart, and perfectly balanced.', shortDescription: 'Cannabis lemonade — 10mg THC, refreshing and crisp.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 90, featured: true, isNew: true, isActive: true, flavor: 'Lemonade' },
    { name: 'OG Kush Vape Cart', slug: 'og-kush-vape-cart', category: 'vapes', strainType: 'Hybrid', price: '45.00', weight: '1g', thc: '85-90%', description: 'Premium 1g vape cartridge filled with OG Kush distillate. Compatible with all 510-thread batteries.', shortDescription: 'OG Kush distillate cart — 1g, 85-90% THC.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 45, featured: true, isNew: false, isActive: true, flavor: 'Fuel & Pine' },
    { name: 'Strawberry Disposable Pen', slug: 'strawberry-disposable-pen', category: 'vapes', strainType: 'Indica', price: '35.00', weight: '0.5g', thc: '80-85%', description: 'All-in-one disposable vape pen with strawberry-flavored indica distillate. No charging needed.', shortDescription: 'Disposable strawberry indica pen — 0.5g, ready to use.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 55, featured: false, isNew: true, isActive: true, flavor: 'Strawberry' },
    { name: 'Blue Raspberry Live Resin Cart', slug: 'blue-raspberry-live-resin-cart', category: 'vapes', strainType: 'Sativa', price: '55.00', weight: '1g', thc: '78-85%', description: 'Full-spectrum live resin cartridge. Preserves the full terpene profile for a richer flavour.', shortDescription: 'Blue raspberry live resin cart — full-spectrum sativa.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 30, featured: true, isNew: true, isActive: true, flavor: 'Blue Raspberry' },
    { name: 'Live Resin — Gelato', slug: 'live-resin-gelato', category: 'concentrates', strainType: 'Hybrid', price: '50.00', weight: '1g', thc: '70-80%', description: 'Premium live resin extracted from fresh-frozen Gelato flower. Full-spectrum terpene profile.', shortDescription: 'Gelato live resin — full-spectrum, golden and saucy.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 25, featured: true, isNew: false, isActive: true, flavor: 'Sweet & Creamy' },
    { name: 'THCA Diamonds', slug: 'thca-diamonds', category: 'concentrates', strainType: 'Sativa', price: '65.00', weight: '1g', thc: '90-99%', description: 'Ultra-pure THCA crystalline diamonds. The highest potency concentrate available.', shortDescription: 'THCA diamonds — 90-99% pure, ultra-potent crystalline.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 15, featured: true, isNew: true, isActive: true, flavor: 'Citrus & Terpene' },
    { name: 'Bubble Hash', slug: 'bubble-hash', category: 'concentrates', strainType: 'Indica', price: '35.00', weight: '1g', thc: '50-65%', description: 'Traditional ice-water extracted bubble hash. Rich, earthy flavour with a smooth, clean high.', shortDescription: 'Full-melt bubble hash — traditional, earthy, smooth.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 30, featured: false, isNew: false, isActive: true, flavor: 'Earthy & Hash' },
    { name: 'Premium Grinder', slug: 'premium-grinder', category: 'accessories', strainType: 'N/A', price: '25.00', weight: '1 unit', thc: 'N/A', description: 'Heavy-duty 4-piece aluminum grinder with kief catcher. Sharp diamond-shaped teeth for a consistent grind.', shortDescription: '4-piece aluminum grinder with kief catcher.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 80, featured: false, isNew: false, isActive: true, flavor: 'N/A' },
    { name: 'Glass Water Pipe', slug: 'glass-water-pipe', category: 'accessories', strainType: 'N/A', price: '75.00', weight: '1 unit', thc: 'N/A', description: 'Hand-blown borosilicate glass water pipe with ice catcher and percolator. 12 inches tall.', shortDescription: '12" glass water pipe with ice catcher and perc.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 15, featured: true, isNew: false, isActive: true, flavor: 'N/A' },
    { name: '510 Thread Battery', slug: '510-thread-battery', category: 'accessories', strainType: 'N/A', price: '20.00', weight: '1 unit', thc: 'N/A', description: 'Slim, discreet 510-thread vape battery with variable voltage. USB-C rechargeable.', shortDescription: 'Variable voltage 510 battery — slim, USB-C rechargeable.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 60, featured: false, isNew: true, isActive: true, flavor: 'N/A' },
  ];

  for (const p of products) {
    const id = nextId();
    _products.push({
      id,
      name: p.name,
      slug: p.slug,
      category: p.category as any,
      strainType: p.strainType as any,
      price: p.price,
      weight: p.weight,
      thc: p.thc,
      description: p.description,
      shortDescription: p.shortDescription,
      image: p.image,
      images: p.images,
      stock: p.stock,
      featured: p.featured,
      isNew: p.isNew,
      isActive: p.isActive,
      flavor: p.flavor,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed shipping zones
  const zones = [
    { name: 'Ontario', provinces: ['ON'], rate: '9.99', freeThreshold: '150.00', estimatedDays: '2-3', isActive: true },
    { name: 'Quebec', provinces: ['QC'], rate: '12.99', freeThreshold: '150.00', estimatedDays: '3-5', isActive: true },
    { name: 'British Columbia', provinces: ['BC'], rate: '14.99', freeThreshold: '150.00', estimatedDays: '5-7', isActive: true },
    { name: 'Alberta', provinces: ['AB'], rate: '12.99', freeThreshold: '150.00', estimatedDays: '4-6', isActive: true },
    { name: 'Rest of Canada', provinces: ['MB','SK','NS','NB','NL','PE','NT','YT','NU'], rate: '16.99', freeThreshold: '175.00', estimatedDays: '7-10', isActive: true },
  ];
  for (const z of zones) {
    _shippingZones.push({ id: nextId(), ...z, createdAt: now, updatedAt: now });
  }

  // Seed email templates
  const templates = [
    { slug: 'order-confirmation', name: 'Order Confirmation', subject: 'Your My Legacy Cannabis Order #{{orderNumber}}', body: '<h1>Thank you for your order!</h1><p>Hi {{customerName}},</p><p>Your order #{{orderNumber}} has been confirmed.</p>', isActive: true },
    { slug: 'order-shipped', name: 'Order Shipped', subject: 'Your order #{{orderNumber}} has shipped!', body: '<h1>Your order is on the way!</h1><p>Hi {{customerName}},</p><p>Your order #{{orderNumber}} has shipped.</p>', isActive: true },
    { slug: 'id-verification-approved', name: 'ID Verification Approved', subject: 'Your ID has been verified — My Legacy Cannabis', body: '<h1>ID Verified!</h1><p>Hi {{customerName}}, your ID has been successfully verified.</p>', isActive: true },
  ];
  for (const t of templates) {
    _emailTemplates.push({ id: nextId(), ...t, createdAt: now, updatedAt: now });
  }

  // Seed admin user
  const adminId = nextId();
  _users.push({
    id: adminId,
    openId: 'admin_owner_001',
    name: 'Admin User',
    email: 'admin@mylegacycannabis.ca',
    phone: '+14372154722',
    phoneVerified: true,
    emailVerified: true,
    googleId: null,
    authMethod: 'email',
    loginMethod: 'email',
    role: 'admin',
    birthday: '1990-01-01',
    rewardPoints: 500,
    idVerified: true,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  });

  // Seed some sample orders
  const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];
  const sampleOrders = [
    { orderNumber: 'ORD-2024-001', status: 'delivered', paymentStatus: 'confirmed', total: '83.00', guestName: 'John Smith', guestEmail: 'john@example.com', shippingAddress: JSON.stringify({ street: '123 Main St', city: 'Toronto', province: 'ON', postalCode: 'M5H 2N2' }) },
    { orderNumber: 'ORD-2024-002', status: 'shipped', paymentStatus: 'confirmed', total: '127.00', guestName: 'Sarah Johnson', guestEmail: 'sarah@example.com', shippingAddress: JSON.stringify({ street: '456 Queen St', city: 'Mississauga', province: 'ON', postalCode: 'L5B 1M4' }) },
    { orderNumber: 'ORD-2024-003', status: 'pending', paymentStatus: 'pending', total: '55.00', guestName: 'Mike Williams', guestEmail: 'mike@example.com', shippingAddress: JSON.stringify({ street: '789 King Ave', city: 'Ottawa', province: 'ON', postalCode: 'K1A 0A6' }) },
    { orderNumber: 'ORD-2024-004', status: 'confirmed', paymentStatus: 'confirmed', total: '210.00', guestName: 'Emily Davis', guestEmail: 'emily@example.com', shippingAddress: JSON.stringify({ street: '321 Bay St', city: 'Brampton', province: 'ON', postalCode: 'L6Y 4W2' }) },
    { orderNumber: 'ORD-2024-005', status: 'delivered', paymentStatus: 'confirmed', total: '95.00', guestName: 'David Chen', guestEmail: 'david@example.com', shippingAddress: JSON.stringify({ street: '654 Yonge St', city: 'North York', province: 'ON', postalCode: 'M2M 3S3' }) },
  ];

  for (const o of sampleOrders) {
    const orderId = nextId();
    const createdDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    _orders.push({
      id: orderId,
      orderNumber: o.orderNumber,
      userId: null,
      status: o.status as any,
      paymentStatus: o.paymentStatus as any,
      total: o.total,
      subtotal: o.total,
      tax: '0.00',
      shipping: '9.99',
      guestName: o.guestName,
      guestEmail: o.guestEmail,
      guestPhone: null,
      shippingAddress: o.shippingAddress,
      billingAddress: o.shippingAddress,
      notes: null,
      trackingNumber: o.status === 'shipped' || o.status === 'delivered' ? 'TRK' + Math.random().toString(36).substr(2, 9).toUpperCase() : null,
      createdAt: createdDate,
      updatedAt: createdDate,
    });
  }

  console.log(`[DB] Seeded ${_products.length} products, ${_shippingZones.length} shipping zones, ${_orders.length} sample orders`);
}

// Initialize seed data
seedData();

// ─── HELPER FUNCTIONS ───
function paginate<T>(arr: T[], page: number, limit: number) {
  const offset = (page - 1) * limit;
  return arr.slice(offset, offset + limit);
}

// ─── USER HELPERS ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');
  const existing = _users.find(u => u.openId === user.openId);
  const now = new Date();
  if (existing) {
    if (user.name !== undefined) existing.name = user.name ?? null;
    if (user.email !== undefined) existing.email = user.email ?? null;
    if (user.phone !== undefined) existing.phone = user.phone ?? null;
    if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
    if (user.lastSignedIn !== undefined) existing.lastSignedIn = user.lastSignedIn ?? now;
    if (user.role !== undefined) existing.role = user.role ?? 'user';
    if (user.authMethod !== undefined) existing.authMethod = user.authMethod ?? null;
    if (user.rewardPoints !== undefined) existing.rewardPoints = user.rewardPoints ?? 0;
    if (user.birthday !== undefined) existing.birthday = user.birthday ?? null;
    if (user.idVerified !== undefined) existing.idVerified = user.idVerified ?? false;
    if (user.phoneVerified !== undefined) existing.phoneVerified = user.phoneVerified ?? false;
    if (user.emailVerified !== undefined) existing.emailVerified = user.emailVerified ?? false;
    existing.updatedAt = now;
  } else {
    const id = nextId();
    _users.push({
      id,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      phoneVerified: user.phoneVerified ?? false,
      emailVerified: user.emailVerified ?? false,
      googleId: user.googleId ?? null,
      authMethod: user.authMethod ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? 'user',
      birthday: user.birthday ?? null,
      rewardPoints: user.rewardPoints ?? 0,
      idVerified: user.idVerified ?? false,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    });
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  return _users.find(u => u.openId === openId);
}

export async function getAllUsers(page = 1, limit = 50) {
  const sorted = [..._users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { data: paginate(sorted, page, limit), total: sorted.length };
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return _users.find(u => u.email?.toLowerCase() === email.toLowerCase());
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  return _users.find(u => u.phone === phone);
}

export async function getUserByGoogleId(googleId: string): Promise<User | undefined> {
  return _users.find(u => u.googleId === googleId);
}

export async function updateUser(id: number, data: Partial<InsertUser>): Promise<void> {
  const user = _users.find(u => u.id === id);
  if (!user) return;
  Object.assign(user, data, { updatedAt: new Date() });
}

// ─── OTP / VERIFICATION CODE HELPERS ───
export async function createVerificationCode(data: { identifier: string; code: string; type: 'sms' | 'email'; purpose: 'login' | 'register' | 'verify'; expiresAt: Date }): Promise<number> {
  // Invalidate existing unused codes
  _verificationCodes.filter(c => c.identifier === data.identifier && c.type === data.type && !c.verified)
    .forEach(c => { c.verified = true; });
  const id = nextId();
  _verificationCodes.push({ id, ...data, attempts: 0, verified: false, createdAt: new Date() });
  return id;
}

export async function verifyCode(identifier: string, code: string, type: 'sms' | 'email'): Promise<{ valid: boolean; reason?: string }> {
  const records = _verificationCodes
    .filter(c => c.identifier === identifier && c.type === type && !c.verified)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (records.length === 0) return { valid: false, reason: 'No verification code found.' };
  const record = records[0];
  if (new Date() > record.expiresAt) { record.verified = true; return { valid: false, reason: 'Code has expired.' }; }
  if (record.attempts >= 5) { record.verified = true; return { valid: false, reason: 'Too many attempts.' }; }
  if (record.code !== code) { record.attempts++; return { valid: false, reason: `Incorrect code. ${4 - record.attempts} attempts remaining.` }; }
  record.verified = true;
  return { valid: true };
}

// ─── PRODUCT HELPERS ───
export async function getAllProducts(opts?: { page?: number; limit?: number; category?: string; search?: string; activeOnly?: boolean }) {
  let filtered = [..._products];
  if (opts?.category) filtered = filtered.filter(p => p.category === opts.category);
  if (opts?.activeOnly) filtered = filtered.filter(p => p.isActive);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s));
  }
  const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  return { data: paginate(sorted, page, limit), total: sorted.length };
}

export async function getProductById(id: number): Promise<Product | undefined> {
  return _products.find(p => p.id === id);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return _products.find(p => p.slug === slug);
}

export async function createProduct(data: InsertProduct): Promise<number> {
  const id = nextId();
  const now = new Date();
  _products.push({ id, ...data, stock: data.stock ?? 0, featured: data.featured ?? false, isNew: data.isNew ?? false, isActive: data.isActive ?? true, rewardPoints: 0, createdAt: now, updatedAt: now } as any);
  return id;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<void> {
  const p = _products.find(p => p.id === id);
  if (!p) return;
  Object.assign(p, data, { updatedAt: new Date() });
}

export async function deleteProduct(id: number): Promise<void> {
  const idx = _products.findIndex(p => p.id === id);
  if (idx !== -1) _products.splice(idx, 1);
}

// ─── ORDER HELPERS ───
export async function getAllOrders(opts?: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: Date; dateTo?: Date }) {
  let filtered = [..._orders];
  if (opts?.status) filtered = filtered.filter(o => o.status === opts.status);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    filtered = filtered.filter(o =>
      o.orderNumber.toLowerCase().includes(s) ||
      (o.guestEmail ?? '').toLowerCase().includes(s) ||
      (o.guestName ?? '').toLowerCase().includes(s)
    );
  }
  if (opts?.dateFrom) filtered = filtered.filter(o => o.createdAt >= opts.dateFrom!);
  if (opts?.dateTo) filtered = filtered.filter(o => o.createdAt <= opts.dateTo!);
  const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  return { data: paginate(sorted, page, limit), total: sorted.length };
}

export async function getOrderById(id: number) {
  return _orders.find(o => o.id === id);
}

export async function getOrderItems(orderId: number) {
  return _orderItems.filter(i => i.orderId === orderId);
}

export async function createOrder(data: InsertOrder): Promise<number> {
  const id = nextId();
  const now = new Date();
  _orders.push({ id, ...data, createdAt: now, updatedAt: now } as any);
  return id;
}

export async function createOrderItems(items: InsertOrderItem[]): Promise<void> {
  for (const item of items) {
    _orderItems.push({ id: nextId(), ...item, createdAt: new Date() });
  }
}

export async function updateOrder(id: number, data: Partial<InsertOrder>): Promise<void> {
  const o = _orders.find(o => o.id === id);
  if (!o) return;
  Object.assign(o, data, { updatedAt: new Date() });
}

// ─── ID VERIFICATION HELPERS ───
export async function getAllVerifications(opts?: { page?: number; limit?: number; status?: string }) {
  let filtered = [..._idVerifications];
  if (opts?.status) filtered = filtered.filter(v => v.status === opts.status);
  const sorted = filtered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  return { data: paginate(sorted, page, limit), total: sorted.length };
}

export async function getVerificationById(id: number) {
  return _idVerifications.find((v: any) => v.id === id);
}

export async function createVerification(data: InsertIdVerification): Promise<number> {
  const id = nextId();
  _idVerifications.push({ id, status: 'pending', ...data, createdAt: new Date(), updatedAt: new Date() });
  return id;
}

export async function updateVerification(id: number, data: Partial<InsertIdVerification>): Promise<void> {
  const v = _idVerifications.find((v: any) => v.id === id);
  if (!v) return;
  Object.assign(v, data, { updatedAt: new Date() });
}

// ─── SHIPPING ZONE HELPERS ───
export async function getAllShippingZones() {
  return [..._shippingZones].sort((a: any, b: any) => a.id - b.id);
}

export async function updateShippingZone(id: number, data: Partial<InsertShippingZone>): Promise<void> {
  const z = _shippingZones.find((z: any) => z.id === id);
  if (!z) return;
  Object.assign(z, data, { updatedAt: new Date() });
}

export async function createShippingZone(data: InsertShippingZone): Promise<number> {
  const id = nextId();
  _shippingZones.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() });
  return id;
}

// ─── EMAIL TEMPLATE HELPERS ───
export async function getAllEmailTemplates() {
  return [..._emailTemplates].sort((a: any, b: any) => a.slug.localeCompare(b.slug));
}

export async function getEmailTemplateBySlug(slug: string) {
  return _emailTemplates.find((t: any) => t.slug === slug);
}

export async function updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<void> {
  const t = _emailTemplates.find((t: any) => t.id === id);
  if (!t) return;
  Object.assign(t, data, { updatedAt: new Date() });
}

export async function createEmailTemplate(data: InsertEmailTemplate): Promise<number> {
  const id = nextId();
  _emailTemplates.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() });
  return id;
}

// ─── ADMIN ACTIVITY LOG ───
export async function logAdminActivity(data: InsertAdminActivityLog): Promise<void> {
  _adminActivityLog.push({ id: nextId(), ...data, createdAt: new Date() });
}

export async function getAdminActivityLog(opts?: { page?: number; limit?: number }) {
  const sorted = [..._adminActivityLog].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  return { data: paginate(sorted, page, limit), total: sorted.length };
}

// ─── REWARDS HISTORY ───
export async function addRewardsHistory(data: InsertRewardsHistory): Promise<void> {
  _rewardsHistory.push({ id: nextId(), ...data, createdAt: new Date() });
}

export async function getRewardsHistoryByUser(userId: number) {
  return [..._rewardsHistory]
    .filter((r: any) => r.userId === userId)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ─── DASHBOARD STATS ───
export async function getDashboardStats() {
  const totalOrders = _orders.length;
  const totalRevenue = _orders
    .filter(o => (o as any).paymentStatus === 'confirmed')
    .reduce((sum, o) => sum + parseFloat((o as any).total ?? '0'), 0);
  const pendingVerifications = _idVerifications.filter((v: any) => v.status === 'pending').length;
  const totalProducts = _products.filter(p => p.isActive).length;
  const totalUsers = _users.length;
  const recentOrders = [..._orders]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);
  return { totalOrders, totalRevenue, pendingVerifications, totalProducts, totalUsers, recentOrders };
}

export async function getOrderStats(days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const filtered = _orders.filter(o => o.createdAt >= fromDate);
  const byDate = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of filtered) {
    const date = o.createdAt.toISOString().split('T')[0];
    const existing = byDate.get(date) ?? { orderCount: 0, revenue: 0 };
    existing.orderCount++;
    existing.revenue += parseFloat((o as any).total ?? '0');
    byDate.set(date, existing);
  }
  return Array.from(byDate.entries())
    .map(([date, stats]) => ({ date, orderCount: stats.orderCount, revenue: String(stats.revenue) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(limit = 10) {
  const byProduct = new Map<string, { totalSold: number; totalRevenue: number }>();
  for (const item of _orderItems) {
    const existing = byProduct.get(item.productName) ?? { totalSold: 0, totalRevenue: 0 };
    existing.totalSold += item.quantity;
    existing.totalRevenue += parseFloat(item.price ?? '0') * item.quantity;
    byProduct.set(item.productName, existing);
  }
  return Array.from(byProduct.entries())
    .map(([productName, stats]) => ({ productName, totalSold: stats.totalSold, totalRevenue: String(stats.totalRevenue) }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, limit);
}
