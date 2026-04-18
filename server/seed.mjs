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

// NOTE: This is a legacy MySQL seeder. The canonical email templates (all 13)
// now live in server/emailTemplateSeeds.ts and are auto-synced on server startup.
// The templates below are kept for backward compatibility only.
const seedEmailTemplates = [
  { slug: "welcome-email", name: "Welcome Email", subject: "Welcome to MyLegacy Cannabis, {{customer_name}}!", bodyHtml: "<h1>Welcome!</h1><p>Hi {{customer_name}}, welcome to MyLegacy Cannabis.</p>", variables: ["customer_name","account_url","unsubscribe_url","privacy_url","terms_url"], isActive: true },
  { slug: "admin-id-pending", name: "Admin: ID Verification Pending", subject: "New ID Verification Required — {{customer_name}}", bodyHtml: "<h1>New ID Pending</h1><p>{{customer_name}} ({{customer_email}}) submitted ID verification.</p>", variables: ["customer_name","customer_email","user_id","submission_date","id_type","admin_review_url"], isActive: true },
  { slug: "id-rejected", name: "ID Verification Rejected", subject: "ID Verification Update — MyLegacy Cannabis", bodyHtml: "<h1>ID Rejected</h1><p>Hi {{customer_name}}, your ID was not approved. Reason: {{rejection_reason}}</p>", variables: ["customer_name","rejection_reason","resubmit_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "id-verified", name: "Account Verified", subject: "Your Account is Verified — MyLegacy Cannabis", bodyHtml: "<h1>Verified!</h1><p>Hi {{customer_name}}, your account is now verified.</p>", variables: ["customer_name","shop_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "order-confirmation", name: "Order Confirmation", subject: "Order Confirmed — #{{order_id}}", bodyHtml: "<h1>Order Confirmed!</h1><p>Hi {{customer_name}}, order #{{order_id}} confirmed.</p>", variables: ["customer_name","order_id","order_total","order_items","delivery_address","payment_amount","payment_reference","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "payment-received-customer", name: "Payment Received (Customer)", subject: "Payment Received — Order #{{order_id}}", bodyHtml: "<h1>Payment Received</h1><p>Hi {{customer_name}}, payment for order #{{order_id}} received.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "payment-received-admin", name: "Payment Received (Admin)", subject: "New Payment Received — Order #{{order_id}}", bodyHtml: "<h1>Payment Received</h1><p>Payment received for order #{{order_id}}.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-order-placed", name: "Guest Order Placed", subject: "Order Received — #{{order_id}}", bodyHtml: "<h1>Order Received</h1><p>Hi {{customer_name}}, your order #{{order_id}} has been received.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-id-pending-admin", name: "Guest ID Pending (Admin)", subject: "New Guest ID Verification — Order #{{order_id}}", bodyHtml: "<h1>Guest ID Pending</h1><p>Guest {{customer_name}} submitted ID for order #{{order_id}}.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-id-rejected", name: "Guest ID Rejected", subject: "ID Verification Failed — MyLegacy Cannabis", bodyHtml: "<h1>ID Rejected</h1><p>Hi {{customer_name}}, your guest ID verification failed.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-id-verified", name: "Guest ID Verified", subject: "ID Verified — Your Order is Being Processed", bodyHtml: "<h1>ID Verified</h1><p>Hi {{customer_name}}, your ID is verified. Order #{{order_id}} is being processed.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-payment-received", name: "Guest Payment Received", subject: "Payment Received — Order #{{order_id}}", bodyHtml: "<h1>Payment Received</h1><p>Hi {{customer_name}}, payment for order #{{order_id}} received.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
  { slug: "guest-payment-admin", name: "Guest Payment (Admin)", subject: "Guest Payment Received — Order #{{order_id}}", bodyHtml: "<h1>Guest Payment</h1><p>Guest payment received for order #{{order_id}}.</p>", variables: ["customer_name","order_id","order_total","action_url","unsubscribe_url","privacy_url"], isActive: true },
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
