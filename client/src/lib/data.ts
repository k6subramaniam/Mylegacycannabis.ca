// ============================================================
// My Legacy Cannabis — Data Models & Sample Data
// Design: Bold Pop Commerce with Purple/Orange theme
// ============================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  strainType: 'Sativa' | 'Indica' | 'Hybrid' | 'CBD' | 'N/A';
  thc: string;
  cbd?: string;
  price: number;
  originalPrice?: number;
  weight: string;
  description: string;
  shortDescription: string;
  flavor: string;
  image: string;
  images: string[];
  inStock: boolean;
  featured: boolean;
  isNew?: boolean;
  rating: number;
  reviewCount: number;
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  hours: string;
  mapUrl: string;
  directionsUrl: string;
  lat: number;
  lng: number;
}

export interface ShippingZone {
  name: string;
  provinces: string[];
  rate: number;
  deliveryTime: string;
}

export interface RewardTier {
  name: string;
  pointsRequired: number;
  discount: number;
  effectiveValue: string;
  target: string;
}

// ============================================================
// CATEGORIES
// ============================================================
export const categories: Category[] = [
  { name: 'Flower', slug: 'flower', description: 'Premium dried cannabis flower — hand-trimmed buds in a variety of strains.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600&q=80', productCount: 12 },
  { name: 'Pre-Rolls', slug: 'pre-rolls', description: 'Ready-to-smoke pre-rolled joints — perfect for convenience.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&q=80', productCount: 8 },
  { name: 'Edibles', slug: 'edibles', description: 'Cannabis-infused gummies, chocolates, and beverages.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=600&q=80', productCount: 10 },
  { name: 'Vapes', slug: 'vapes', description: 'Vape cartridges and disposable pens for smooth sessions.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=600&q=80', productCount: 6 },
  { name: 'Concentrates', slug: 'concentrates', description: 'Shatter, wax, live resin, and hash for experienced users.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', productCount: 5 },
  { name: 'Accessories', slug: 'accessories', description: 'Rolling papers, grinders, pipes, and more.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=600&q=80', productCount: 8 },
];

// ============================================================
// PRODUCTS
// ============================================================
export const products: Product[] = [
  // FLOWER
  { id: 'p1', name: 'Purple Kush', slug: 'purple-kush', category: 'Flower', categorySlug: 'flower', strainType: 'Indica', thc: '22-26%', price: 35, weight: '3.5g', description: 'Purple Kush is a pure indica strain that emerged from the Oakland area of California as the result of crossing Hindu Kush and Purple Afghani. Its aroma is subtle and earthy with sweet overtones typical of Kush varieties. Blissful, long-lasting euphoria blankets the mind while physical relaxation rids the body of pain, insomnia, and stress.', shortDescription: 'Pure indica with earthy, sweet Kush aroma. Deeply relaxing.', flavor: 'Earthy & Sweet', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: true, isNew: false, rating: 4.8, reviewCount: 124 },
  { id: 'p2', name: 'Blue Dream', slug: 'blue-dream', category: 'Flower', categorySlug: 'flower', strainType: 'Hybrid', thc: '21-28%', price: 38, weight: '3.5g', description: 'Blue Dream is a sativa-dominant hybrid originating in California that has achieved legendary status among West Coast strains. Crossing a Blueberry indica with the sativa Haze, Blue Dream balances full-body relaxation with gentle cerebral invigoration. Novice and veteran consumers alike enjoy the level effects of Blue Dream.', shortDescription: 'Legendary hybrid — blueberry aroma with balanced effects.', flavor: 'Blueberry & Haze', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], inStock: true, featured: true, isNew: true, rating: 4.9, reviewCount: 203 },
  { id: 'p3', name: 'OG Kush', slug: 'og-kush', category: 'Flower', categorySlug: 'flower', strainType: 'Hybrid', thc: '20-25%', price: 40, weight: '3.5g', description: 'OG Kush is a legendary strain with a name that has recognition even outside of the cannabis world. Despite its fame, its exact origins remain a mystery. OG Kush develops a complex aroma with notes of fuel, skunk, and spice. The high is heavy and heady, yet still balanced enough for conversation and creativity.', shortDescription: 'Legendary hybrid with fuel and spice aroma. Heavy yet balanced.', flavor: 'Fuel & Spice', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: false, rating: 4.7, reviewCount: 189 },
  { id: 'p4', name: 'Sour Diesel', slug: 'sour-diesel', category: 'Flower', categorySlug: 'flower', strainType: 'Sativa', thc: '20-25%', price: 36, weight: '3.5g', description: 'Sour Diesel, sometimes called Sour D, is an invigorating sativa-dominant strain named after its pungent, diesel-like aroma. This fast-acting strain delivers energizing, dreamy cerebral effects that have pushed Sour Diesel to its legendary status.', shortDescription: 'Energizing sativa with pungent diesel aroma.', flavor: 'Diesel & Citrus', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: false, rating: 4.6, reviewCount: 156 },
  { id: 'p5', name: 'Pink Kush', slug: 'pink-kush', category: 'Flower', categorySlug: 'flower', strainType: 'Indica', thc: '25-30%', price: 45, weight: '3.5g', description: 'Pink Kush is a potent indica-dominant strain with powerful body-focused effects. A relative of OG Kush, Pink Kush has a sweet, floral aroma with vanilla undertones. Known for its ability to crush stress and pain.', shortDescription: 'Potent indica with sweet vanilla and floral notes.', flavor: 'Sweet & Vanilla', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: true, rating: 4.9, reviewCount: 178 },
  { id: 'p6', name: 'Wedding Cake', slug: 'wedding-cake', category: 'Flower', categorySlug: 'flower', strainType: 'Hybrid', thc: '24-27%', price: 42, weight: '3.5g', description: 'Wedding Cake, also known as Pink Cookies, is a potent indica-hybrid strain made by crossing Triangle Kush with Animal Mints. Rich and tangy with earthy pepper undertones, this strain provides relaxing and euphoric effects.', shortDescription: 'Rich, tangy hybrid with relaxing euphoria.', flavor: 'Vanilla & Pepper', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: false, rating: 4.8, reviewCount: 145 },
  { id: 'p7', name: 'Gelato', slug: 'gelato', category: 'Flower', categorySlug: 'flower', strainType: 'Hybrid', thc: '20-25%', price: 44, weight: '3.5g', description: 'Gelato is a hybrid cannabis strain made from a cross between Sunset Sherbet and Thin Mint Girl Scout Cookies. This strain produces a euphoric high accompanied by strong feelings of relaxation. Gelato has a sweet, fruity aroma.', shortDescription: 'Sweet, fruity hybrid with euphoric relaxation.', flavor: 'Sweet & Fruity', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: true, rating: 4.7, reviewCount: 167 },
  { id: 'p8', name: 'Northern Lights', slug: 'northern-lights', category: 'Flower', categorySlug: 'flower', strainType: 'Indica', thc: '18-22%', price: 32, weight: '3.5g', description: 'Northern Lights stands among the most famous strains of all time. A pure indica cherished for its resinous buds, fast flowering, and resilience during growth. Pungently sweet, spicy aromas radiate from the crystal-coated buds.', shortDescription: 'Classic pure indica — sweet, spicy, deeply relaxing.', flavor: 'Sweet & Spicy', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], inStock: true, featured: false, rating: 4.6, reviewCount: 198 },
  // PRE-ROLLS
  { id: 'p9', name: 'Indica Pre-Roll Pack', slug: 'indica-pre-roll-pack', category: 'Pre-Rolls', categorySlug: 'pre-rolls', strainType: 'Indica', thc: '20-24%', price: 25, weight: '3x0.5g', description: 'Three perfectly rolled 0.5g indica joints. Smooth, slow-burning, and ready to enjoy. Made with premium ground flower for consistent quality every time.', shortDescription: 'Three 0.5g indica joints — smooth and slow-burning.', flavor: 'Earthy & Pine', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], inStock: true, featured: true, rating: 4.5, reviewCount: 89 },
  { id: 'p10', name: 'Sativa Pre-Roll Pack', slug: 'sativa-pre-roll-pack', category: 'Pre-Rolls', categorySlug: 'pre-rolls', strainType: 'Sativa', thc: '22-26%', price: 25, weight: '3x0.5g', description: 'Three energizing sativa pre-rolls, perfect for daytime use. Each joint is 0.5g of premium sativa flower, hand-rolled for a smooth, even burn.', shortDescription: 'Three 0.5g sativa joints — energizing and uplifting.', flavor: 'Citrus & Tropical', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], inStock: true, featured: false, rating: 4.6, reviewCount: 76 },
  { id: 'p11', name: 'Infused Pre-Roll King', slug: 'infused-pre-roll-king', category: 'Pre-Rolls', categorySlug: 'pre-rolls', strainType: 'Hybrid', thc: '35-40%', price: 18, weight: '1g', description: 'A premium 1g king-size pre-roll infused with live resin concentrate and rolled in kief. This is not for beginners — expect powerful, long-lasting effects from this triple-threat joint.', shortDescription: 'King-size infused joint — live resin + kief. Extremely potent.', flavor: 'Gassy & Sweet', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], inStock: true, featured: true, isNew: true, rating: 4.9, reviewCount: 112 },
  { id: 'p12', name: 'CBD Calm Pre-Roll', slug: 'cbd-calm-pre-roll', category: 'Pre-Rolls', categorySlug: 'pre-rolls', strainType: 'CBD', thc: '1-3%', cbd: '15-20%', price: 12, weight: '1g', description: 'A high-CBD, low-THC pre-roll designed for relaxation without the intense psychoactive effects. Perfect for unwinding after a long day or managing anxiety.', shortDescription: 'High-CBD pre-roll for calm relaxation without the high.', flavor: 'Herbal & Floral', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], inStock: true, featured: false, rating: 4.4, reviewCount: 54 },
  // EDIBLES
  { id: 'p13', name: 'Mixed Fruit Gummies', slug: 'mixed-fruit-gummies', category: 'Edibles', categorySlug: 'edibles', strainType: 'Hybrid', thc: '10mg/pack', price: 15, weight: '10 pieces', description: 'Delicious mixed fruit gummies infused with 10mg THC total (1mg per gummy). Perfect for micro-dosing or sharing. Flavors include strawberry, orange, grape, and lemon.', shortDescription: 'Mixed fruit gummies — 10mg THC total, 10 pieces.', flavor: 'Mixed Fruit', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], inStock: true, featured: true, rating: 4.7, reviewCount: 201 },
  { id: 'p14', name: 'Sour Watermelon Gummies', slug: 'sour-watermelon-gummies', category: 'Edibles', categorySlug: 'edibles', strainType: 'Sativa', thc: '10mg/pack', price: 15, weight: '10 pieces', description: 'Sour watermelon flavored gummies with a tangy kick. 10mg THC total per pack. Sativa-dominant for an uplifting, creative experience.', shortDescription: 'Sour watermelon gummies — 10mg THC, uplifting sativa.', flavor: 'Sour Watermelon', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], inStock: true, featured: false, isNew: true, rating: 4.8, reviewCount: 143 },
  { id: 'p15', name: 'Dark Chocolate Bar', slug: 'dark-chocolate-bar', category: 'Edibles', categorySlug: 'edibles', strainType: 'Indica', thc: '10mg/bar', price: 12, weight: '1 bar', description: 'Rich dark chocolate bar infused with 10mg THC. Divided into 10 squares for easy dosing. Made with premium Belgian chocolate and indica-dominant extract.', shortDescription: 'Dark chocolate bar — 10mg THC, 10 breakable squares.', flavor: 'Dark Chocolate', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], inStock: true, featured: false, rating: 4.5, reviewCount: 87 },
  { id: 'p16', name: 'THC Lemonade', slug: 'thc-lemonade', category: 'Edibles', categorySlug: 'edibles', strainType: 'Hybrid', thc: '10mg/bottle', price: 8, weight: '355ml', description: 'Refreshing cannabis-infused lemonade with 10mg THC per bottle. Crisp, tart, and perfectly balanced. Great for social occasions or a sunny afternoon.', shortDescription: 'Cannabis lemonade — 10mg THC, refreshing and crisp.', flavor: 'Lemonade', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], inStock: true, featured: true, isNew: true, rating: 4.6, reviewCount: 65 },
  // VAPES
  { id: 'p17', name: 'OG Kush Vape Cart', slug: 'og-kush-vape-cart', category: 'Vapes', categorySlug: 'vapes', strainType: 'Hybrid', thc: '85-90%', price: 45, weight: '1g', description: 'Premium 1g vape cartridge filled with OG Kush distillate. Smooth, potent, and full of flavor. Compatible with all 510-thread batteries.', shortDescription: 'OG Kush distillate cart — 1g, 85-90% THC.', flavor: 'Fuel & Pine', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], inStock: true, featured: true, rating: 4.7, reviewCount: 134 },
  { id: 'p18', name: 'Strawberry Disposable Pen', slug: 'strawberry-disposable-pen', category: 'Vapes', categorySlug: 'vapes', strainType: 'Indica', thc: '80-85%', price: 35, weight: '0.5g', description: 'All-in-one disposable vape pen with strawberry-flavored indica distillate. No charging, no cartridge swapping — just inhale and enjoy. 0.5g capacity.', shortDescription: 'Disposable strawberry indica pen — 0.5g, ready to use.', flavor: 'Strawberry', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], inStock: true, featured: false, isNew: true, rating: 4.5, reviewCount: 78 },
  // CONCENTRATES
  { id: 'p19', name: 'Live Resin — Gelato', slug: 'live-resin-gelato', category: 'Concentrates', categorySlug: 'concentrates', strainType: 'Hybrid', thc: '70-80%', price: 50, weight: '1g', description: 'Premium live resin extracted from fresh-frozen Gelato flower. Full-spectrum terpene profile delivers an authentic, flavorful dabbing experience. Golden, saucy consistency.', shortDescription: 'Gelato live resin — full-spectrum, golden and saucy.', flavor: 'Sweet & Creamy', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], inStock: true, featured: true, rating: 4.9, reviewCount: 92 },
  { id: 'p20', name: 'Shatter — Pink Kush', slug: 'shatter-pink-kush', category: 'Concentrates', categorySlug: 'concentrates', strainType: 'Indica', thc: '75-85%', price: 40, weight: '1g', description: 'Glass-like Pink Kush shatter with exceptional purity. Clean, potent, and perfect for dabbing. Delivers heavy indica effects with sweet, floral notes.', shortDescription: 'Pink Kush shatter — glass-like purity, heavy indica.', flavor: 'Sweet & Floral', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], inStock: true, featured: false, rating: 4.6, reviewCount: 67 },
  // ACCESSORIES
  { id: 'p21', name: 'Premium Grinder', slug: 'premium-grinder', category: 'Accessories', categorySlug: 'accessories', strainType: 'N/A', thc: 'N/A', price: 25, weight: '1 unit', description: 'Heavy-duty 4-piece aluminum grinder with kief catcher. Sharp diamond-shaped teeth for a consistent grind every time. Available in matte black.', shortDescription: '4-piece aluminum grinder with kief catcher.', flavor: 'N/A', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], inStock: true, featured: false, rating: 4.4, reviewCount: 45 },
  { id: 'p22', name: 'Rolling Paper Bundle', slug: 'rolling-paper-bundle', category: 'Accessories', categorySlug: 'accessories', strainType: 'N/A', thc: 'N/A', price: 10, weight: '3 packs', description: 'Bundle of 3 packs of premium unbleached rolling papers. Slow-burning, natural hemp papers with filter tips included. King-size.', shortDescription: '3-pack unbleached hemp rolling papers with tips.', flavor: 'N/A', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], inStock: true, featured: false, rating: 4.3, reviewCount: 32 },
];

// ============================================================
// STORE LOCATIONS
// ============================================================
export const storeLocations: StoreLocation[] = [
  { id: 'loc1', name: 'Mississauga', address: '255 Dundas St W', city: 'Mississauga', province: 'ON', postalCode: 'L5B 1H4', phone: '(437) 215-4722', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2889.5!2d-79.6!3d43.59!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDPCsDM1JzI0LjAiTiA3OcKwMzYnMDAuMCJX!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=255+Dundas+St+W+Mississauga+ON', lat: 43.59, lng: -79.6 },
  { id: 'loc2', name: 'Hamilton', address: '123 King St E', city: 'Hamilton', province: 'ON', postalCode: 'L8N 1A9', phone: '(905) 555-0123', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2906.5!2d-79.87!3d43.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=123+King+St+E+Hamilton+ON', lat: 43.25, lng: -79.87 },
  { id: 'loc3', name: 'Queen St Toronto', address: '456 Queen St W', city: 'Toronto', province: 'ON', postalCode: 'M5V 2A8', phone: '(416) 555-0456', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2887.5!2d-79.4!3d43.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=456+Queen+St+W+Toronto+ON', lat: 43.65, lng: -79.4 },
  { id: 'loc4', name: 'Dundas Toronto', address: '789 Dundas St W', city: 'Toronto', province: 'ON', postalCode: 'M6J 1V1', phone: '(416) 555-0789', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2887.5!2d-79.41!3d43.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=789+Dundas+St+W+Toronto+ON', lat: 43.65, lng: -79.41 },
  { id: 'loc5', name: 'Merivale Ottawa', address: '1642 Merivale Rd', city: 'Ottawa', province: 'ON', postalCode: 'K2G 4A1', phone: '(613) 555-0164', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2800.5!2d-75.73!3d45.35!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=1642+Merivale+Rd+Ottawa+ON', lat: 45.35, lng: -75.73 },
];

// ============================================================
// SHIPPING ZONES
// ============================================================
export const shippingZones: ShippingZone[] = [
  { name: 'Ontario', provinces: ['ON'], rate: 10, deliveryTime: '2-4 business days' },
  { name: 'Quebec', provinces: ['QC'], rate: 12, deliveryTime: '3-5 business days' },
  { name: 'Western Canada', provinces: ['BC', 'AB', 'SK', 'MB'], rate: 15, deliveryTime: '4-7 business days' },
  { name: 'Atlantic Canada', provinces: ['NS', 'NB', 'PE', 'NL'], rate: 18, deliveryTime: '5-8 business days' },
  { name: 'Northern Territories', provinces: ['YT', 'NT', 'NU'], rate: 25, deliveryTime: '7-14 business days' },
];

export const FREE_SHIPPING_THRESHOLD = 150;
export const MINIMUM_ORDER = 40;

// ============================================================
// REWARDS PROGRAM
// ============================================================
export const rewardTiers: RewardTier[] = [
  { name: 'Starter', pointsRequired: 100, discount: 5, effectiveValue: '5.0%', target: 'New loyalists' },
  { name: 'Silver', pointsRequired: 250, discount: 15, effectiveValue: '6.0%', target: 'Regular buyers' },
  { name: 'Gold', pointsRequired: 500, discount: 30, effectiveValue: '6.0%', target: 'Frequent shoppers' },
  { name: 'Platinum', pointsRequired: 1000, discount: 75, effectiveValue: '7.5%', target: 'High-value customers' },
  { name: 'VIP', pointsRequired: 2000, discount: 150, effectiveValue: '7.5%', target: 'Ultra-loyal members' },
];

export const POINTS_PER_DOLLAR = 1;
export const WELCOME_BONUS = 25;
export const BIRTHDAY_BONUS = 100;
export const REVIEW_BONUS = 10;
export const REFERRAL_BONUS_REFERRER = 50;
export const REFERRAL_BONUS_REFEREE = 25;
export const MIN_REDEMPTION_POINTS = 100;
export const MAX_DISCOUNT_PERCENT = 50;

// ============================================================
// PROVINCES LIST
// ============================================================
export const canadianProvinces = [
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
];

export function getShippingRate(provinceCode: string): ShippingZone | undefined {
  return shippingZones.find(z => z.provinces.includes(provinceCode));
}

export function calculateShipping(subtotal: number, provinceCode: string): { rate: number; isFree: boolean; zone: ShippingZone | undefined } {
  const zone = getShippingRate(provinceCode);
  if (!zone) return { rate: 0, isFree: false, zone: undefined };
  const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  return { rate: isFree ? 0 : zone.rate, isFree, zone };
}

export function getEligibleRewardTiers(points: number): RewardTier[] {
  return rewardTiers.filter(t => points >= t.pointsRequired);
}

export function calculatePointsEarned(subtotal: number): number {
  return Math.floor(subtotal * POINTS_PER_DOLLAR);
}
