import { drizzle } from "drizzle-orm/mysql2";
import { products, shippingZones, emailTemplates } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const seedProducts = [
  { name: "Purple Kush", slug: "purple-kush", category: "flower", strainType: "Indica", price: "35.00", weight: "3.5g", thc: "22-26%", description: "A pure indica strain with earthy, sweet grape aroma. Known for deep body relaxation and sedative effects. Perfect for evening use.", shortDescription: "Pure indica with sweet grape aroma", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 100, featured: true, isNew: false, isActive: true, flavor: "Grape & Earth" },
  { name: "Blue Dream", slug: "blue-dream", category: "flower", strainType: "Hybrid", price: "38.00", weight: "3.5g", thc: "21-28%", description: "A legendary sativa-dominant hybrid with sweet berry aroma. Delivers gentle cerebral invigoration with full-body relaxation.", shortDescription: "Legendary hybrid with berry aroma", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 80, featured: true, isNew: true, isActive: true, flavor: "Berry & Sweet" },
  { name: "Pink Kush", slug: "pink-kush", category: "flower", strainType: "Indica", price: "45.00", weight: "3.5g", thc: "23-30%", description: "A potent indica-dominant strain with sweet vanilla and candy-like aroma. Provides powerful body relaxation.", shortDescription: "Potent indica with vanilla aroma", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 60, featured: true, isNew: false, isActive: true, flavor: "Vanilla & Candy" },
  { name: "Gelato", slug: "gelato", category: "flower", strainType: "Hybrid", price: "44.00", weight: "3.5g", thc: "20-25%", description: "A balanced hybrid with sweet, dessert-like aroma. Known for its beautiful purple buds and relaxing yet uplifting effects.", shortDescription: "Balanced hybrid with dessert aroma", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 75, featured: true, isNew: false, isActive: true, flavor: "Sweet & Citrus" },
  { name: "OG Kush", slug: "og-kush", category: "flower", strainType: "Hybrid", price: "40.00", weight: "3.5g", thc: "20-25%", description: "The legendary OG Kush with earthy pine and sour lemon scent. A classic hybrid for balanced effects.", shortDescription: "Classic hybrid with earthy pine", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 90, featured: false, isNew: false, isActive: true, flavor: "Pine & Lemon" },
  { name: "Sour Diesel", slug: "sour-diesel", category: "flower", strainType: "Sativa", price: "42.00", weight: "3.5g", thc: "20-25%", description: "An invigorating sativa with pungent diesel aroma. Known for fast-acting, energizing cerebral effects.", shortDescription: "Energizing sativa with diesel aroma", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 70, featured: false, isNew: false, isActive: true, flavor: "Diesel & Citrus" },
  { name: "Wedding Cake", slug: "wedding-cake", category: "flower", strainType: "Hybrid", price: "46.00", weight: "3.5g", thc: "22-27%", description: "A rich, tangy hybrid with peppery vanilla undertones. Delivers relaxing and euphoric effects.", shortDescription: "Rich hybrid with vanilla notes", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 55, featured: false, isNew: false, isActive: true, flavor: "Vanilla & Pepper" },
  { name: "Northern Lights", slug: "northern-lights", category: "flower", strainType: "Indica", price: "36.00", weight: "3.5g", thc: "18-22%", description: "A classic indica with sweet, spicy aroma. Renowned for its resinous buds and dreamy relaxation.", shortDescription: "Classic indica for relaxation", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 85, featured: false, isNew: false, isActive: true, flavor: "Sweet & Spicy" },
  { name: "Indica Pre-Roll Pack", slug: "indica-pre-roll-pack", category: "pre-rolls", strainType: "Indica", price: "25.00", weight: "5x0.5g", thc: "20-24%", description: "Five premium indica pre-rolls, perfect for unwinding. Each joint is hand-rolled with care.", shortDescription: "5-pack indica pre-rolls", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 120, featured: false, isNew: false, isActive: true, flavor: "Mixed Indica" },
  { name: "Sativa Pre-Roll Pack", slug: "sativa-pre-roll-pack", category: "pre-rolls", strainType: "Sativa", price: "25.00", weight: "5x0.5g", thc: "18-22%", description: "Five premium sativa pre-rolls for daytime enjoyment. Hand-rolled for consistent quality.", shortDescription: "5-pack sativa pre-rolls", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 100, featured: false, isNew: false, isActive: true, flavor: "Mixed Sativa" },
  { name: "Infused Pre-Roll King", slug: "infused-pre-roll-king", category: "pre-rolls", strainType: "Hybrid", price: "18.00", weight: "1.5g", thc: "30-35%", description: "A king-size infused pre-roll packed with concentrate for maximum potency.", shortDescription: "King-size infused pre-roll", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 50, featured: false, isNew: true, isActive: true, flavor: "Hybrid Blend" },
  { name: "CBD Calm Pre-Roll", slug: "cbd-calm-pre-roll", category: "pre-rolls", strainType: "CBD", price: "15.00", weight: "1g", thc: "1-3%", description: "A calming CBD pre-roll with minimal THC. Perfect for relaxation without the high.", shortDescription: "CBD pre-roll for calm", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 80, featured: false, isNew: false, isActive: true, flavor: "Herbal & Earthy" },
  { name: "Mixed Fruit Gummies", slug: "mixed-fruit-gummies", category: "edibles", strainType: "Hybrid", price: "22.00", weight: "10x10mg", thc: "100mg total", description: "Delicious mixed fruit gummies with 10mg THC each. Precise dosing for a consistent experience.", shortDescription: "10-pack fruit gummies", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 150, featured: false, isNew: false, isActive: true, flavor: "Mixed Fruit" },
  { name: "Sour Watermelon Gummies", slug: "sour-watermelon-gummies", category: "edibles", strainType: "Sativa", price: "24.00", weight: "10x10mg", thc: "100mg total", description: "Tangy sour watermelon gummies with uplifting sativa effects. 10mg per piece.", shortDescription: "Sour watermelon gummies", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 120, featured: false, isNew: true, isActive: true, flavor: "Sour Watermelon" },
  { name: "THC Lemonade", slug: "thc-lemonade", category: "edibles", strainType: "Hybrid", price: "12.00", weight: "355ml", thc: "10mg", description: "Refreshing THC-infused lemonade. A perfect summer beverage with a gentle buzz.", shortDescription: "THC-infused lemonade drink", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 200, featured: false, isNew: true, isActive: true, flavor: "Lemonade" },
  { name: "Dark Chocolate Bar", slug: "dark-chocolate-bar", category: "edibles", strainType: "Indica", price: "20.00", weight: "100mg", thc: "100mg total", description: "Premium dark chocolate infused with indica extract. Rich flavor with relaxing effects.", shortDescription: "THC dark chocolate bar", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 90, featured: false, isNew: false, isActive: true, flavor: "Dark Chocolate" },
  { name: "OG Kush Vape Cart", slug: "og-kush-vape-cart", category: "vapes", strainType: "Hybrid", price: "48.00", weight: "1g", thc: "85-90%", description: "Premium OG Kush vape cartridge with full-spectrum distillate. Smooth hits with classic OG flavor.", shortDescription: "OG Kush 1g vape cartridge", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 65, featured: false, isNew: false, isActive: true, flavor: "OG Kush" },
  { name: "Strawberry Disposable Pen", slug: "strawberry-disposable-pen", category: "vapes", strainType: "Indica", price: "35.00", weight: "0.5g", thc: "80-85%", description: "Convenient disposable vape pen with sweet strawberry flavor. No charging needed.", shortDescription: "Strawberry disposable vape", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 100, featured: false, isNew: true, isActive: true, flavor: "Strawberry" },
  { name: "Live Resin — Gelato", slug: "live-resin-gelato", category: "concentrates", strainType: "Hybrid", price: "55.00", weight: "1g", thc: "70-80%", description: "Premium live resin made from fresh-frozen Gelato flower. Full terpene profile for maximum flavor.", shortDescription: "Gelato live resin concentrate", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 40, featured: false, isNew: false, isActive: true, flavor: "Gelato" },
  { name: "Shatter — Pink Kush", slug: "shatter-pink-kush", category: "concentrates", strainType: "Indica", price: "40.00", weight: "1g", thc: "75-85%", description: "Crystal-clear Pink Kush shatter with potent indica effects. Perfect for dabbing.", shortDescription: "Pink Kush shatter concentrate", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 45, featured: false, isNew: false, isActive: true, flavor: "Pink Kush" },
  { name: "Premium Grinder", slug: "premium-grinder", category: "accessories", strainType: "N/A", price: "25.00", weight: "N/A", thc: "N/A", description: "4-piece aluminum herb grinder with kief catcher. Precision-machined teeth for the perfect grind.", shortDescription: "4-piece aluminum grinder", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 200, featured: false, isNew: false, isActive: true, flavor: "N/A" },
  { name: "Rolling Paper Bundle", slug: "rolling-paper-bundle", category: "accessories", strainType: "N/A", price: "10.00", weight: "N/A", thc: "N/A", description: "Premium unbleached rolling papers bundle. Includes papers, filters, and a rolling tray.", shortDescription: "Rolling papers bundle pack", image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600", stock: 300, featured: false, isNew: false, isActive: true, flavor: "N/A" },
];

const seedShippingZones = [
  { zoneName: "Ontario", provinces: ["ON"], rate: "10.00", deliveryDays: "1-3 business days", isActive: true },
  { zoneName: "Quebec", provinces: ["QC"], rate: "12.00", deliveryDays: "2-4 business days", isActive: true },
  { zoneName: "Western Canada", provinces: ["BC", "AB", "SK", "MB"], rate: "15.00", deliveryDays: "3-5 business days", isActive: true },
  { zoneName: "Atlantic Canada", provinces: ["NB", "NS", "PE", "NL"], rate: "18.00", deliveryDays: "4-7 business days", isActive: true },
  { zoneName: "Northern Territories", provinces: ["YT", "NT", "NU"], rate: "25.00", deliveryDays: "7-14 business days", isActive: true },
];

const seedEmailTemplates = [
  {
    slug: "order-confirmation",
    name: "Order Confirmation",
    subject: "Order Confirmed — {{orderNumber}}",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">Order Confirmed!</h2><p>Hi {{customerName}},</p><p>Thank you for your order <strong>{{orderNumber}}</strong>. We've received it and will begin processing once payment is confirmed.</p><h3 style="color:#4B2D8E;">Payment Instructions</h3><p>Please send an Interac e-Transfer of <strong>{{total}}</strong> to:</p><p style="background:#F5F5F5;padding:15px;border-radius:8px;"><strong>payments@mylegacycannabis.ca</strong><br/>Include your order number <strong>{{orderNumber}}</strong> in the message.</p><h3 style="color:#4B2D8E;">Order Summary</h3>{{orderItems}}<p><strong>Subtotal:</strong> {{subtotal}}<br/><strong>Shipping:</strong> {{shipping}}<br/><strong>Total:</strong> {{total}}</p><p>Questions? Reply to this email or call us at (437) 215-4722.</p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["orderNumber", "customerName", "total", "subtotal", "shipping", "orderItems"],
    isActive: true,
  },
  {
    slug: "order-shipped",
    name: "Order Shipped",
    subject: "Your Order {{orderNumber}} Has Shipped!",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">Your Order Has Shipped!</h2><p>Hi {{customerName}},</p><p>Great news! Your order <strong>{{orderNumber}}</strong> is on its way.</p><p style="background:#F5F5F5;padding:15px;border-radius:8px;"><strong>Tracking Number:</strong> {{trackingNumber}}<br/><a href="{{trackingUrl}}" style="color:#F15929;">Track Your Package</a></p><p>Estimated delivery: {{deliveryEstimate}}</p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["orderNumber", "customerName", "trackingNumber", "trackingUrl", "deliveryEstimate"],
    isActive: true,
  },
  {
    slug: "order-delivered",
    name: "Order Delivered",
    subject: "Your Order {{orderNumber}} Has Been Delivered",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">Order Delivered!</h2><p>Hi {{customerName}},</p><p>Your order <strong>{{orderNumber}}</strong> has been delivered. We hope you enjoy your products!</p><p>Don't forget — you earned <strong>{{pointsEarned}} reward points</strong> with this purchase.</p><p><a href="https://mylegacycannabis.ca/rewards" style="background:#F15929;color:#fff;padding:12px 24px;border-radius:25px;text-decoration:none;display:inline-block;">Check Your Rewards</a></p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["orderNumber", "customerName", "pointsEarned"],
    isActive: true,
  },
  {
    slug: "id-approved",
    name: "ID Verification Approved",
    subject: "Your ID Has Been Verified — My Legacy Cannabis",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">ID Verified!</h2><p>Hi {{customerName}},</p><p>Your ID verification has been <strong style="color:green;">approved</strong>. You can now place orders without re-verifying.</p><p><a href="https://mylegacycannabis.ca/shop" style="background:#F15929;color:#fff;padding:12px 24px;border-radius:25px;text-decoration:none;display:inline-block;">Start Shopping</a></p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["customerName"],
    isActive: true,
  },
  {
    slug: "id-rejected",
    name: "ID Verification Rejected",
    subject: "ID Verification Update — My Legacy Cannabis",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">ID Verification Update</h2><p>Hi {{customerName}},</p><p>Unfortunately, your ID verification was <strong style="color:red;">not approved</strong>.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please resubmit a clear photo of a valid government-issued ID.</p><p><a href="https://mylegacycannabis.ca/account/verify-id" style="background:#F15929;color:#fff;padding:12px 24px;border-radius:25px;text-decoration:none;display:inline-block;">Resubmit ID</a></p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["customerName", "reason"],
    isActive: true,
  },
  {
    slug: "payment-received",
    name: "Payment Received",
    subject: "Payment Received for Order {{orderNumber}}",
    bodyHtml: `<div style="font-family:Roboto,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#4B2D8E;padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;">My Legacy Cannabis</h1></div><div style="padding:30px;"><h2 style="color:#4B2D8E;">Payment Received!</h2><p>Hi {{customerName}},</p><p>We've received your e-Transfer payment for order <strong>{{orderNumber}}</strong>. Your order is now being processed and will ship soon.</p></div><div style="background:#333;color:#fff;padding:15px;text-align:center;font-size:12px;">My Legacy Cannabis — Open 24/7</div></div>`,
    variables: ["orderNumber", "customerName"],
    isActive: true,
  },
];

async function seed() {
  console.log("Seeding products...");
  for (const p of seedProducts) {
    try {
      await db.insert(products).values(p).onDuplicateKeyUpdate({ set: { name: p.name } });
    } catch (e) { console.log(`Skipping ${p.name}: ${e.message}`); }
  }
  console.log(`Seeded ${seedProducts.length} products`);

  console.log("Seeding shipping zones...");
  for (const z of seedShippingZones) {
    try {
      await db.insert(shippingZones).values(z);
    } catch (e) { console.log(`Skipping ${z.zoneName}: ${e.message}`); }
  }
  console.log(`Seeded ${seedShippingZones.length} shipping zones`);

  console.log("Seeding email templates...");
  for (const t of seedEmailTemplates) {
    try {
      await db.insert(emailTemplates).values(t).onDuplicateKeyUpdate({ set: { name: t.name } });
    } catch (e) { console.log(`Skipping ${t.name}: ${e.message}`); }
  }
  console.log(`Seeded ${seedEmailTemplates.length} email templates`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
