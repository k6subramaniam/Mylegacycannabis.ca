/**
 * Persistent database layer using Drizzle ORM + PostgreSQL (Supabase).
 *
 * When DATABASE_URL is set, all data is stored in PostgreSQL and survives
 * deploys / restarts.  When DATABASE_URL is empty the module falls back to
 * the legacy in-memory arrays so local dev still works without a DB.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, sql, ilike, or, and, gte, lte, count } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { EMAIL_TEMPLATE_SEEDS } from "./emailTemplateSeeds";

// ─── CONNECTION ───
const DATABASE_URL = process.env.DATABASE_URL || "";

let _db: PostgresJsDatabase<typeof schema> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    _sql = postgres(DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for Supabase transaction pooler (port 6543)
      ssl: { rejectUnauthorized: false },
      onnotice: () => {}, // Suppress NOTICE messages (e.g. "relation already exists")
    });
    _db = drizzle(_sql, { schema });
  }
  return _db;
}

export const USE_PERSISTENT_DB = !!DATABASE_URL;

// ─── AUTO-CREATE TABLES (push schema) ───
export async function initializeDatabase(): Promise<void> {
  if (!USE_PERSISTENT_DB) {
    console.log("[DB] No DATABASE_URL — using in-memory store");
    seedInMemoryData();
    return;
  }

  console.log("[DB] Connecting to PostgreSQL...");
  const db = getDb();

  // Create enums & tables if they don't exist
  // Using raw SQL for idempotent DDL (CREATE IF NOT EXISTS)
  // Create enums individually (pooler doesn't support multi-statement queries)
  const enumDefs = [
    { name: 'auth_method', values: "'phone','email','google'" },
    { name: 'role', values: "'user','admin'" },
    { name: 'verification_code_type', values: "'sms','email'" },
    { name: 'verification_code_purpose', values: "'login','register','verify'" },
    { name: 'product_category', values: "'flower','pre-rolls','edibles','vapes','concentrates','accessories'" },
    { name: 'strain_type', values: "'Sativa','Indica','Hybrid','CBD','N/A'" },
    { name: 'order_status', values: "'pending','confirmed','processing','shipped','delivered','cancelled','refunded'" },
    { name: 'payment_status', values: "'pending','received','confirmed','refunded'" },
    { name: 'verification_status', values: "'pending','approved','rejected'" },
    { name: 'rewards_type', values: "'earned','redeemed','bonus','deducted','admin_add','admin_deduct'" },
  ];
  for (const e of enumDefs) {
    await _sql!.unsafe(`DO $$ BEGIN CREATE TYPE ${e.name} AS ENUM (${e.values}); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  }

  // Create tables
  await _sql!`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      open_id VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      phone VARCHAR(20),
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      google_id VARCHAR(255),
      auth_method auth_method DEFAULT 'email',
      login_method VARCHAR(64),
      role role NOT NULL DEFAULT 'user',
      birthday VARCHAR(10),
      reward_points INTEGER NOT NULL DEFAULT 0,
      id_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      admin_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_signed_in TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(320) NOT NULL,
      code VARCHAR(6) NOT NULL,
      type verification_code_type NOT NULL,
      purpose verification_code_purpose NOT NULL DEFAULT 'login',
      attempts INTEGER NOT NULL DEFAULT 0,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      category product_category NOT NULL,
      strain_type strain_type DEFAULT 'Hybrid',
      price NUMERIC(10,2) NOT NULL,
      weight VARCHAR(50),
      thc VARCHAR(50),
      description TEXT,
      short_description VARCHAR(500),
      image TEXT,
      images JSON,
      stock INTEGER NOT NULL DEFAULT 0,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_new BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      flavor VARCHAR(100),
      reward_points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(30) NOT NULL UNIQUE,
      user_id INTEGER,
      guest_email VARCHAR(320),
      guest_name VARCHAR(255),
      guest_phone VARCHAR(20),
      status order_status NOT NULL DEFAULT 'pending',
      payment_status payment_status NOT NULL DEFAULT 'pending',
      subtotal NUMERIC(10,2) NOT NULL,
      shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount NUMERIC(10,2) NOT NULL DEFAULT 0,
      points_redeemed INTEGER NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL,
      shipping_address JSON,
      shipping_zone VARCHAR(50),
      tracking_number VARCHAR(100),
      tracking_url TEXT,
      notes TEXT,
      admin_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name VARCHAR(255) NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS id_verifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      guest_email VARCHAR(320),
      guest_name VARCHAR(255),
      front_image_url TEXT NOT NULL,
      selfie_image_url TEXT,
      id_type VARCHAR(100),
      status verification_status NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS shipping_zones (
      id SERIAL PRIMARY KEY,
      zone_name VARCHAR(100) NOT NULL,
      provinces JSON NOT NULL,
      rate NUMERIC(10,2) NOT NULL,
      free_threshold NUMERIC(10,2),
      estimated_days VARCHAR(50),
      delivery_days VARCHAR(50) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS email_templates (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body_html TEXT NOT NULL,
      variables JSON,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      admin_name VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS rewards_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type rewards_type NOT NULL,
      points INTEGER NOT NULL,
      description VARCHAR(500) NOT NULL,
      order_id INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await _sql!`
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── New enum for coupons ───
  await _sql!.unsafe(`DO $$ BEGIN CREATE TYPE coupon_type AS ENUM ('percentage','fixed_amount','free_shipping'); EXCEPTION WHEN duplicate_object THEN null; END $$`);

  // ─── Alter rewards_type enum to add new values ───
  for (const val of ['birthday', 'referral', 'review']) {
    await _sql!.unsafe(`DO $$ BEGIN ALTER TYPE rewards_type ADD VALUE IF NOT EXISTS '${val}'; EXCEPTION WHEN duplicate_object THEN null; END $$`);
  }

  // ─── Alter users table — add new columns ───
  await _sql!`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER`;
  await _sql!`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20)`;
  await _sql!`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_birthday_bonus VARCHAR(4)`;

  // ─── Alter orders table — add coupon columns ───
  await _sql!`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)`;
  await _sql!`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0`;

  // ─── Coupons table ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      type coupon_type NOT NULL,
      value NUMERIC(10,2) NOT NULL,
      min_order_amount NUMERIC(10,2),
      max_discount NUMERIC(10,2),
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      per_user_limit INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      starts_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Coupon usage tracking ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS coupon_usage (
      id SERIAL PRIMARY KEY,
      coupon_id INTEGER NOT NULL,
      order_id INTEGER,
      email VARCHAR(320) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Referral codes ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      times_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Referral tracking ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS referral_tracking (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL,
      referral_code_id INTEGER NOT NULL,
      referrer_points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
      referee_points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Product reviews ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      order_id INTEGER,
      rating INTEGER NOT NULL,
      title VARCHAR(255),
      body TEXT,
      tags JSON,
      strength_rating INTEGER,
      smoothness_rating INTEGER,
      effect_tags JSON,
      experience_level VARCHAR(20),
      usage_timing VARCHAR(20),
      would_recommend BOOLEAN,
      is_approved BOOLEAN NOT NULL DEFAULT TRUE,
      points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Add structured review columns if table was created before this update ───
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS tags JSON`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS strength_rating INTEGER`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS smoothness_rating INTEGER`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS effect_tags JSON`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20)`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS usage_timing VARCHAR(20)`;
  await _sql!`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN`;

  // ─── E-Transfer Payment Records ───
  // Create enums first (PostgreSQL requires DO block for IF NOT EXISTS on enums)
  await _sql!`DO $$ BEGIN CREATE TYPE etransfer_match_confidence AS ENUM ('exact','high','low','none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await _sql!`DO $$ BEGIN CREATE TYPE etransfer_status AS ENUM ('auto_matched','manual_matched','unmatched','ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await _sql!`
    CREATE TABLE IF NOT EXISTS payment_records (
      id SERIAL PRIMARY KEY,
      email_id VARCHAR(255) NOT NULL UNIQUE,
      sender_name VARCHAR(255),
      sender_email VARCHAR(320),
      amount NUMERIC(10,2),
      memo TEXT,
      raw_subject VARCHAR(500),
      raw_body_snippet TEXT,
      received_at TIMESTAMP,
      matched_order_id INTEGER,
      matched_order_number VARCHAR(30),
      match_confidence etransfer_match_confidence DEFAULT 'none',
      match_method VARCHAR(100),
      status etransfer_status NOT NULL DEFAULT 'unmatched',
      reviewed_by INTEGER,
      reviewed_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // ─── Store Locations (admin-manageable) ───
  await _sql!`
    CREATE TABLE IF NOT EXISTS store_locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500) NOT NULL,
      city VARCHAR(255) NOT NULL,
      province VARCHAR(10) NOT NULL,
      postal_code VARCHAR(10) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      hours VARCHAR(100) NOT NULL DEFAULT 'Open 24/7',
      map_url TEXT,
      directions_url TEXT,
      lat NUMERIC(10,6),
      lng NUMERIC(10,6),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("[DB] PostgreSQL tables created / verified");

  // Seed if empty
  const existingUsers = await db.select({ cnt: count() }).from(schema.users);
  if (existingUsers[0].cnt === 0) {
    console.log("[DB] Empty database — seeding initial data...");
    await seedPersistentData(db);
  } else {
    console.log(`[DB] Database has ${existingUsers[0].cnt} users — skipping seed`);
  }

  // Always upsert email templates (ensures new templates are added to existing DBs)
  await syncEmailTemplates(db);

  // Seed default site settings if they don't exist
  await seedDefaultSettings(db);

  // Seed default store locations if empty
  await seedDefaultLocations(db);
}

async function seedDefaultSettings(db: PostgresJsDatabase<typeof schema>) {
  const defaults: { key: string; value: string }[] = [
    { key: 'id_verification_enabled', value: 'true' },
    { key: 'maintenance_mode_enabled', value: 'false' },
    { key: 'maintenance_title', value: 'We\'ll Be Right Back' },
    { key: 'maintenance_message', value: 'Our store is currently undergoing scheduled maintenance. We appreciate your patience and will be back online shortly. Please check back soon!' },
    { key: 'store_hours', value: JSON.stringify({
      monday:    { open: '10:00', close: '22:00', closed: false },
      tuesday:   { open: '10:00', close: '22:00', closed: false },
      wednesday: { open: '10:00', close: '22:00', closed: false },
      thursday:  { open: '10:00', close: '22:00', closed: false },
      friday:    { open: '10:00', close: '23:00', closed: false },
      saturday:  { open: '10:00', close: '23:00', closed: false },
      sunday:    { open: '11:00', close: '21:00', closed: false },
    }) },
    { key: 'store_hours_enabled', value: 'true' },
    { key: 'store_hours_note', value: 'Orders placed outside business hours will be processed on the next business day.' },
  ];
  for (const d of defaults) {
    const existing = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, d.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(schema.siteSettings).values(d);
    }
  }
}

// ─── STORE LOCATIONS — default seeds ───
const DEFAULT_LOCATIONS = [
  { name: 'Mississauga', address: '255 Dundas St W', city: 'Mississauga', province: 'ON', postalCode: 'L5B 1H4', phone: '(437) 215-4722', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2889.5!2d-79.6!3d43.59!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDPCsDM1JzI0LjAiTiA3OcKwMzYnMDAuMCJX!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=255+Dundas+St+W+Mississauga+ON', lat: '43.590000', lng: '-79.600000', sortOrder: 0 },
  { name: 'Hamilton', address: '123 King St E', city: 'Hamilton', province: 'ON', postalCode: 'L8N 1A9', phone: '(905) 555-0123', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2906.5!2d-79.87!3d43.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=123+King+St+E+Hamilton+ON', lat: '43.250000', lng: '-79.870000', sortOrder: 1 },
  { name: 'Queen St Toronto', address: '456 Queen St W', city: 'Toronto', province: 'ON', postalCode: 'M5V 2A8', phone: '(416) 555-0456', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2887.5!2d-79.4!3d43.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=456+Queen+St+W+Toronto+ON', lat: '43.650000', lng: '-79.400000', sortOrder: 2 },
  { name: 'Dundas Toronto', address: '789 Dundas St W', city: 'Toronto', province: 'ON', postalCode: 'M6J 1V1', phone: '(416) 555-0789', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2887.5!2d-79.41!3d43.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=789+Dundas+St+W+Toronto+ON', lat: '43.650000', lng: '-79.410000', sortOrder: 3 },
  { name: 'Merivale Ottawa', address: '1642 Merivale Rd', city: 'Ottawa', province: 'ON', postalCode: 'K2G 4A1', phone: '(613) 555-0164', hours: 'Open 24/7', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2800.5!2d-75.73!3d45.35!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sca!4v1', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=1642+Merivale+Rd+Ottawa+ON', lat: '45.350000', lng: '-75.730000', sortOrder: 4 },
];

async function seedDefaultLocations(db: PostgresJsDatabase<typeof schema>) {
  const existing = await db.select({ cnt: count() }).from(schema.storeLocations);
  if (existing[0].cnt > 0) return;
  console.log("[DB] Seeding default store locations...");
  for (const loc of DEFAULT_LOCATIONS) {
    await db.insert(schema.storeLocations).values(loc);
  }
  console.log(`[DB] Seeded ${DEFAULT_LOCATIONS.length} default locations`);
}

// ─── STORE LOCATIONS CRUD ───
export async function getActiveLocations() {
  if (!USE_PERSISTENT_DB) return DEFAULT_LOCATIONS.map((loc, i) => ({ id: i + 1, ...loc, isActive: true, createdAt: new Date(), updatedAt: new Date() }));
  return getDb().select().from(schema.storeLocations).where(eq(schema.storeLocations.isActive, true)).orderBy(schema.storeLocations.sortOrder);
}

export async function getAllLocations() {
  if (!USE_PERSISTENT_DB) return DEFAULT_LOCATIONS.map((loc, i) => ({ id: i + 1, ...loc, isActive: true, createdAt: new Date(), updatedAt: new Date() }));
  return getDb().select().from(schema.storeLocations).orderBy(schema.storeLocations.sortOrder);
}

export async function getLocationById(id: number) {
  if (!USE_PERSISTENT_DB) {
    const idx = id - 1;
    if (idx >= 0 && idx < DEFAULT_LOCATIONS.length) return { id, ...DEFAULT_LOCATIONS[idx], isActive: true, createdAt: new Date(), updatedAt: new Date() };
    return null;
  }
  const rows = await getDb().select().from(schema.storeLocations).where(eq(schema.storeLocations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createLocation(data: {
  name: string; address: string; city: string; province: string; postalCode: string;
  phone: string; hours?: string; mapUrl?: string; directionsUrl?: string;
  lat?: string; lng?: string; sortOrder?: number; isActive?: boolean;
}) {
  const db = getDb();
  const result = await db.insert(schema.storeLocations).values(data).returning({ id: schema.storeLocations.id });
  return result[0].id;
}

export async function updateLocation(id: number, data: Partial<{
  name: string; address: string; city: string; province: string; postalCode: string;
  phone: string; hours: string; mapUrl: string; directionsUrl: string;
  lat: string; lng: string; sortOrder: number; isActive: boolean;
}>) {
  const db = getDb();
  await db.update(schema.storeLocations).set({ ...data, updatedAt: new Date() }).where(eq(schema.storeLocations.id, id));
}

export async function deleteLocation(id: number) {
  const db = getDb();
  await db.delete(schema.storeLocations).where(eq(schema.storeLocations.id, id));
}

/**
 * Sync all 13 email templates from the canonical seed data.
 * - Inserts templates that don't exist yet
 * - Updates templates that still have placeholder/basic HTML (< 500 chars)
 *   with the full rich HTML from the PHP originals
 * - Deactivates legacy templates superseded by new ones
 */
async function syncEmailTemplates(db: PostgresJsDatabase<typeof schema>) {
  const existing = await db.select({
    id: schema.emailTemplates.id,
    slug: schema.emailTemplates.slug,
    bodyHtml: schema.emailTemplates.bodyHtml,
  }).from(schema.emailTemplates);

  const existingMap = new Map(existing.map(e => [e.slug, e]));
  let inserted = 0;
  let updated = 0;

  for (const t of EMAIL_TEMPLATE_SEEDS) {
    const ex = existingMap.get(t.slug);
    if (!ex) {
      // New template — insert it
      await db.insert(schema.emailTemplates).values({
        slug: t.slug,
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        variables: t.variables,
        isActive: t.isActive,
      });
      inserted++;
    } else if (ex.bodyHtml.length < 500) {
      // Existing template with basic/placeholder HTML — upgrade to rich version
      await db.update(schema.emailTemplates)
        .set({
          name: t.name,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          variables: t.variables,
          updatedAt: new Date(),
        })
        .where(eq(schema.emailTemplates.id, ex.id));
      updated++;
    }
    // If bodyHtml >= 500 chars, template was already rich or admin-edited — skip
  }

  // Deactivate legacy templates that are superseded by new ones
  const legacySlugs = ['id-verification-approved', 'order-shipped', 'order-delivered'];
  const seedSlugs = new Set(EMAIL_TEMPLATE_SEEDS.map(t => t.slug));
  for (const slug of legacySlugs) {
    if (!seedSlugs.has(slug) && existingMap.has(slug)) {
      await db.update(schema.emailTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.emailTemplates.slug, slug));
    }
  }

  const total = existing.length + inserted;
  if (inserted > 0 || updated > 0) {
    console.log(`[DB] Synced email templates: ${inserted} added, ${updated} upgraded (${total} total)`);
  } else {
    console.log(`[DB] Email templates up to date (${total} total)`);
  }
}

// ========================================================================================
// PERSISTENT DB HELPERS (Drizzle + PostgreSQL)
// ========================================================================================

// ─── USER HELPERS ───
export async function upsertUser(userData: schema.InsertUser): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_upsertUser(userData); return; }
  const db = getDb();
  const existing = await db.select().from(schema.users).where(eq(schema.users.openId, userData.openId!)).limit(1);
  if (existing.length > 0) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (userData.name !== undefined) updates.name = userData.name;
    if (userData.email !== undefined) updates.email = userData.email;
    if (userData.phone !== undefined) updates.phone = userData.phone;
    if (userData.role !== undefined) updates.role = userData.role;
    if (userData.authMethod !== undefined) updates.authMethod = userData.authMethod;
    if (userData.rewardPoints !== undefined) updates.rewardPoints = userData.rewardPoints;
    if (userData.birthday !== undefined) updates.birthday = userData.birthday;
    if (userData.idVerified !== undefined) updates.idVerified = userData.idVerified;
    if (userData.loginMethod !== undefined) updates.loginMethod = userData.loginMethod;
    if (userData.lastSignedIn !== undefined) updates.lastSignedIn = userData.lastSignedIn;
    await db.update(schema.users).set(updates).where(eq(schema.users.openId, userData.openId!));
  } else {
    await db.insert(schema.users).values(userData);
  }
}

export async function getUserByOpenId(openId: string) {
  if (!USE_PERSISTENT_DB) return _mem_getUserByOpenId(openId);
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string) {
  if (!USE_PERSISTENT_DB) return _mem_getUserByEmail(email);
  const db = getDb();
  const rows = await db.select().from(schema.users).where(sql`LOWER(${schema.users.email}) = LOWER(${email})`).limit(1);
  return rows[0];
}

export async function getUserByPhone(phone: string) {
  if (!USE_PERSISTENT_DB) return _mem_getUserByPhone(phone);
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  return rows[0];
}

export async function getUserByGoogleId(googleId: string) {
  if (!USE_PERSISTENT_DB) return _mem_getUserByGoogleId(googleId);
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.googleId, googleId)).limit(1);
  return rows[0];
}

export async function getUserById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getUserById(id);
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0];
}

export async function getAllUsers(page = 1, limit = 50, search?: string) {
  if (!USE_PERSISTENT_DB) return _mem_getAllUsers(page, limit, search);
  const db = getDb();
  const offset = (page - 1) * limit;
  let where = undefined as any;
  if (search) {
    const q = `%${search}%`;
    where = or(
      ilike(schema.users.name, q),
      ilike(schema.users.email, q),
      ilike(schema.users.phone, q),
    );
  }
  const data = await db.select().from(schema.users)
    .where(where)
    .orderBy(desc(schema.users.createdAt))
    .offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.users).where(where);
  return { data, total: totalResult[0].cnt };
}

export async function updateUser(id: number, data: Partial<schema.InsertUser>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateUser(id, data); return; }
  const db = getDb();
  await db.update(schema.users).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_deleteUser(id); return; }
  const db = getDb();
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

export async function getUserOrders(userId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getUserOrders(userId);
  const db = getDb();
  const user = await getUserById(userId);
  if (!user) return [];
  const conditions = [];
  if (user.email) conditions.push(sql`LOWER(${schema.orders.guestEmail}) = LOWER(${user.email})`);
  if (user.phone) conditions.push(eq(schema.orders.guestPhone, user.phone));
  if (conditions.length === 0) return [];
  return db.select().from(schema.orders).where(or(...conditions)).orderBy(desc(schema.orders.createdAt));
}

// ─── OTP / VERIFICATION CODE HELPERS ───
export async function createVerificationCode(data: { identifier: string; code: string; type: "sms" | "email"; purpose: "login" | "register" | "verify"; expiresAt: Date }): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createVerificationCode(data);
  const db = getDb();
  // Invalidate existing
  await db.update(schema.verificationCodes).set({ verified: true })
    .where(and(eq(schema.verificationCodes.identifier, data.identifier), eq(schema.verificationCodes.type, data.type), eq(schema.verificationCodes.verified, false)));
  const result = await db.insert(schema.verificationCodes).values(data).returning({ id: schema.verificationCodes.id });
  return result[0].id;
}

export async function verifyCode(identifier: string, code: string, type: "sms" | "email"): Promise<{ valid: boolean; reason?: string }> {
  if (!USE_PERSISTENT_DB) return _mem_verifyCode(identifier, code, type);
  const db = getDb();
  const records = await db.select().from(schema.verificationCodes)
    .where(and(eq(schema.verificationCodes.identifier, identifier), eq(schema.verificationCodes.type, type), eq(schema.verificationCodes.verified, false)))
    .orderBy(desc(schema.verificationCodes.createdAt));
  if (records.length === 0) return { valid: false, reason: "No verification code found." };
  const record = records[0];
  if (new Date() > record.expiresAt) { await db.update(schema.verificationCodes).set({ verified: true }).where(eq(schema.verificationCodes.id, record.id)); return { valid: false, reason: "Code has expired." }; }
  if (record.attempts >= 5) { await db.update(schema.verificationCodes).set({ verified: true }).where(eq(schema.verificationCodes.id, record.id)); return { valid: false, reason: "Too many attempts." }; }
  if (record.code !== code) { await db.update(schema.verificationCodes).set({ attempts: record.attempts + 1 }).where(eq(schema.verificationCodes.id, record.id)); return { valid: false, reason: `Incorrect code. ${4 - record.attempts} attempts remaining.` }; }
  await db.update(schema.verificationCodes).set({ verified: true }).where(eq(schema.verificationCodes.id, record.id));
  return { valid: true };
}

// ─── PRODUCT HELPERS ───
export async function getAllProducts(opts?: { page?: number; limit?: number; category?: string; search?: string; activeOnly?: boolean }) {
  if (!USE_PERSISTENT_DB) return _mem_getAllProducts(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions = [];
  if (opts?.category) conditions.push(eq(schema.products.category, opts.category as any));
  if (opts?.activeOnly) conditions.push(eq(schema.products.isActive, true));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(ilike(schema.products.name, q), ilike(schema.products.slug, q)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const data = await db.select().from(schema.products).where(where).orderBy(desc(schema.products.createdAt)).offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.products).where(where);
  return { data, total: totalResult[0].cnt };
}

export async function getProductById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getProductById(id);
  const rows = await getDb().select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  return rows[0];
}

export async function getProductBySlug(slug: string) {
  if (!USE_PERSISTENT_DB) return _mem_getProductBySlug(slug);
  const rows = await getDb().select().from(schema.products).where(eq(schema.products.slug, slug)).limit(1);
  return rows[0];
}

export async function createProduct(data: schema.InsertProduct): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createProduct(data);
  const result = await getDb().insert(schema.products).values(data).returning({ id: schema.products.id });
  return result[0].id;
}

export async function updateProduct(id: number, data: Partial<schema.InsertProduct>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateProduct(id, data); return; }
  await getDb().update(schema.products).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.products.id, id));
}

export async function deleteProduct(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_deleteProduct(id); return; }
  await getDb().delete(schema.products).where(eq(schema.products.id, id));
}

// ─── ORDER HELPERS ───
export async function getAllOrders(opts?: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: Date; dateTo?: Date }) {
  if (!USE_PERSISTENT_DB) return _mem_getAllOrders(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions = [];
  if (opts?.status) conditions.push(eq(schema.orders.status, opts.status as any));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(ilike(schema.orders.orderNumber, q), ilike(schema.orders.guestEmail, q), ilike(schema.orders.guestName, q)));
  }
  if (opts?.dateFrom) conditions.push(gte(schema.orders.createdAt, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(schema.orders.createdAt, opts.dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const data = await db.select().from(schema.orders).where(where).orderBy(desc(schema.orders.createdAt)).offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.orders).where(where);
  return { data, total: totalResult[0].cnt };
}

export async function getOrderById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getOrderById(id);
  const rows = await getDb().select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  return rows[0];
}

export async function getOrderItems(orderId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getOrderItems(orderId);
  return getDb().select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
}

export async function createOrder(data: schema.InsertOrder): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createOrder(data);
  const result = await getDb().insert(schema.orders).values(data).returning({ id: schema.orders.id });
  return result[0].id;
}

export async function createOrderItems(items: schema.InsertOrderItem[]): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_createOrderItems(items); return; }
  if (items.length > 0) await getDb().insert(schema.orderItems).values(items);
}

export async function updateOrder(id: number, data: Partial<schema.InsertOrder>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateOrder(id, data); return; }
  await getDb().update(schema.orders).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.orders.id, id));
}

// ─── ID VERIFICATION HELPERS ───
export async function getAllVerifications(opts?: { page?: number; limit?: number; status?: string; email?: string }) {
  if (!USE_PERSISTENT_DB) return _mem_getAllVerifications(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions = [];
  if (opts?.status) conditions.push(eq(schema.idVerifications.status, opts.status as any));
  if (opts?.email) conditions.push(sql`LOWER(${schema.idVerifications.guestEmail}) = LOWER(${opts.email})`);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const data = await db.select().from(schema.idVerifications).where(where).orderBy(desc(schema.idVerifications.createdAt)).offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.idVerifications).where(where);
  return { data, total: totalResult[0].cnt };
}

export async function getVerificationById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getVerificationById(id);
  const rows = await getDb().select().from(schema.idVerifications).where(eq(schema.idVerifications.id, id)).limit(1);
  return rows[0];
}

export async function createVerification(data: schema.InsertIdVerification): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createVerification(data);
  const result = await getDb().insert(schema.idVerifications).values(data).returning({ id: schema.idVerifications.id });
  return result[0].id;
}

export async function updateVerification(id: number, data: Partial<schema.InsertIdVerification>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateVerification(id, data); return; }
  await getDb().update(schema.idVerifications).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.idVerifications.id, id));
}

// ─── SHIPPING ZONE HELPERS ───
export async function getAllShippingZones() {
  if (!USE_PERSISTENT_DB) return _mem_getAllShippingZones();
  return getDb().select().from(schema.shippingZones).orderBy(schema.shippingZones.id);
}

export async function updateShippingZone(id: number, data: Partial<schema.InsertShippingZone>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateShippingZone(id, data); return; }
  await getDb().update(schema.shippingZones).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.shippingZones.id, id));
}

export async function createShippingZone(data: schema.InsertShippingZone): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createShippingZone(data);
  const result = await getDb().insert(schema.shippingZones).values(data).returning({ id: schema.shippingZones.id });
  return result[0].id;
}

// ─── EMAIL TEMPLATE HELPERS ───
export async function getAllEmailTemplates() {
  if (!USE_PERSISTENT_DB) return _mem_getAllEmailTemplates();
  return getDb().select().from(schema.emailTemplates).orderBy(schema.emailTemplates.slug);
}

export async function getEmailTemplateBySlug(slug: string) {
  if (!USE_PERSISTENT_DB) return _mem_getEmailTemplateBySlug(slug);
  const rows = await getDb().select().from(schema.emailTemplates).where(eq(schema.emailTemplates.slug, slug)).limit(1);
  return rows[0];
}

export async function updateEmailTemplate(id: number, data: Partial<schema.InsertEmailTemplate>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateEmailTemplate(id, data); return; }
  await getDb().update(schema.emailTemplates).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.emailTemplates.id, id));
}

export async function createEmailTemplate(data: schema.InsertEmailTemplate): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createEmailTemplate(data);
  const result = await getDb().insert(schema.emailTemplates).values(data).returning({ id: schema.emailTemplates.id });
  return result[0].id;
}

// ─── SITE SETTINGS HELPERS ───
const _settingsCache = new Map<string, string>();

export async function getSiteSetting(key: string): Promise<string | null> {
  // Check cache first
  if (_settingsCache.has(key)) return _settingsCache.get(key)!;
  if (!USE_PERSISTENT_DB) {
    const found = (_siteSettings as any[]).find((s: any) => s.key === key);
    return found?.value ?? null;
  }
  const rows = await getDb().select().from(schema.siteSettings).where(eq(schema.siteSettings.key, key)).limit(1);
  const val = rows[0]?.value ?? null;
  if (val !== null) _settingsCache.set(key, val);
  return val;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  _settingsCache.set(key, value);
  if (!USE_PERSISTENT_DB) {
    const existing = (_siteSettings as any[]).find((s: any) => s.key === key);
    if (existing) { existing.value = value; existing.updatedAt = new Date(); }
    else (_siteSettings as any[]).push({ id: nextId(), key, value, updatedAt: new Date() });
    return;
  }
  const db = getDb();
  const existing = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(schema.siteSettings).set({ value, updatedAt: new Date() }).where(eq(schema.siteSettings.key, key));
  } else {
    await db.insert(schema.siteSettings).values({ key, value });
  }
}

export async function getAllSiteSettings(): Promise<Record<string, string>> {
  if (!USE_PERSISTENT_DB) {
    const result: Record<string, string> = {};
    for (const s of _siteSettings as any[]) result[s.key] = s.value;
    return result;
  }
  const rows = await getDb().select().from(schema.siteSettings);
  const result: Record<string, string> = {};
  for (const r of rows) { result[r.key] = r.value; _settingsCache.set(r.key, r.value); }
  return result;
}

export async function isIdVerificationEnabled(): Promise<boolean> {
  const val = await getSiteSetting('id_verification_enabled');
  return val !== 'false'; // default true if not set
}

export async function isMaintenanceModeEnabled(): Promise<boolean> {
  const val = await getSiteSetting('maintenance_mode_enabled');
  return val === 'true'; // default false if not set
}

export type DayHours = { open: string; close: string; closed: boolean };
export type StoreHours = Record<string, DayHours>;

export async function getStoreHours(): Promise<StoreHours | null> {
  const val = await getSiteSetting('store_hours');
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function getMaintenanceConfig(): Promise<{
  enabled: boolean;
  title: string;
  message: string;
}> {
  const [enabled, title, message] = await Promise.all([
    getSiteSetting('maintenance_mode_enabled'),
    getSiteSetting('maintenance_title'),
    getSiteSetting('maintenance_message'),
  ]);
  return {
    enabled: enabled === 'true',
    title: title || "We'll Be Right Back",
    message: message || 'Our store is currently undergoing maintenance. Please check back soon!',
  };
}

export async function getStoreHoursConfig(): Promise<{
  enabled: boolean;
  hours: StoreHours | null;
  note: string;
}> {
  const [enabled, hours, note] = await Promise.all([
    getSiteSetting('store_hours_enabled'),
    getSiteSetting('store_hours'),
    getSiteSetting('store_hours_note'),
  ]);
  let parsed: StoreHours | null = null;
  if (hours) { try { parsed = JSON.parse(hours); } catch {} }
  return {
    enabled: enabled !== 'false',
    hours: parsed,
    note: note || '',
  };
}

// ─── ADMIN ACTIVITY LOG ───
export async function logAdminActivity(data: schema.InsertAdminActivityLog): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_logAdminActivity(data); return; }
  await getDb().insert(schema.adminActivityLog).values(data);
}

export async function getAdminActivityLog(opts?: { page?: number; limit?: number }) {
  if (!USE_PERSISTENT_DB) return _mem_getAdminActivityLog(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const data = await db.select().from(schema.adminActivityLog).orderBy(desc(schema.adminActivityLog.createdAt)).offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.adminActivityLog);
  return { data, total: totalResult[0].cnt };
}

// ─── REWARDS HISTORY ───
export async function addRewardsHistory(data: schema.InsertRewardsHistory): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_addRewardsHistory(data); return; }
  await getDb().insert(schema.rewardsHistory).values(data);
}

export async function getRewardsHistoryByUser(userId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getRewardsHistoryByUser(userId);
  return getDb().select().from(schema.rewardsHistory).where(eq(schema.rewardsHistory.userId, userId)).orderBy(desc(schema.rewardsHistory.createdAt));
}

// ─── COUPON HELPERS ───
export async function getAllCoupons() {
  if (!USE_PERSISTENT_DB) return _mem_getAllCoupons();
  return getDb().select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
}

export async function getCouponByCode(code: string) {
  if (!USE_PERSISTENT_DB) return _mem_getCouponByCode(code);
  const rows = await getDb().select().from(schema.coupons).where(sql`UPPER(${schema.coupons.code}) = UPPER(${code})`).limit(1);
  return rows[0];
}

export async function getCouponById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getCouponById(id);
  const rows = await getDb().select().from(schema.coupons).where(eq(schema.coupons.id, id)).limit(1);
  return rows[0];
}

export async function createCoupon(data: schema.InsertCoupon): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createCoupon(data);
  const result = await getDb().insert(schema.coupons).values(data).returning({ id: schema.coupons.id });
  return result[0].id;
}

export async function updateCoupon(id: number, data: Partial<schema.InsertCoupon>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateCoupon(id, data); return; }
  await getDb().update(schema.coupons).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.coupons.id, id));
}

export async function deleteCoupon(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_deleteCoupon(id); return; }
  await getDb().delete(schema.coupons).where(eq(schema.coupons.id, id));
}

export async function getCouponUsageByEmail(couponId: number, email: string): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_getCouponUsageByEmail(couponId, email);
  const result = await getDb().select({ cnt: count() }).from(schema.couponUsage)
    .where(and(eq(schema.couponUsage.couponId, couponId), sql`LOWER(${schema.couponUsage.email}) = LOWER(${email})`));
  return result[0].cnt;
}

export async function recordCouponUsage(data: schema.InsertCouponUsage): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_recordCouponUsage(data); return; }
  await getDb().insert(schema.couponUsage).values(data);
  // Increment usage count
  await getDb().update(schema.coupons).set({ usageCount: sql`${schema.coupons.usageCount} + 1`, updatedAt: new Date() }).where(eq(schema.coupons.id, data.couponId));
}

/**
 * Validate a coupon code and calculate the discount.
 * Returns { valid, coupon, discount, error } 
 */
export async function validateCoupon(code: string, subtotal: number, email: string): Promise<{ valid: boolean; coupon?: any; discount: number; error?: string }> {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, discount: 0, error: 'Invalid coupon code.' };
  if (!coupon.isActive) return { valid: false, discount: 0, error: 'This coupon is no longer active.' };
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { valid: false, discount: 0, error: 'This coupon is not yet active.' };
  if (coupon.expiresAt && now > coupon.expiresAt) return { valid: false, discount: 0, error: 'This coupon has expired.' };
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { valid: false, discount: 0, error: 'This coupon has reached its usage limit.' };
  if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) return { valid: false, discount: 0, error: `Minimum order of $${coupon.minOrderAmount} required.` };
  // Check per-user limit
  const userUsage = await getCouponUsageByEmail(coupon.id, email);
  if (userUsage >= coupon.perUserLimit) return { valid: false, discount: 0, error: 'You have already used this coupon.' };

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (parseFloat(coupon.value) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
  } else if (coupon.type === 'fixed_amount') {
    discount = Math.min(parseFloat(coupon.value), subtotal);
  } else if (coupon.type === 'free_shipping') {
    discount = 0; // handled separately — shipping becomes 0
  }
  return { valid: true, coupon, discount: Math.round(discount * 100) / 100 };
}

// ─── REFERRAL HELPERS ───
export async function getReferralCodeByUserId(userId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getReferralCodeByUserId(userId);
  const rows = await getDb().select().from(schema.referralCodes).where(eq(schema.referralCodes.userId, userId)).limit(1);
  return rows[0];
}

export async function getReferralCodeByCode(code: string) {
  if (!USE_PERSISTENT_DB) return _mem_getReferralCodeByCode(code);
  const rows = await getDb().select().from(schema.referralCodes).where(sql`UPPER(${schema.referralCodes.code}) = UPPER(${code})`).limit(1);
  return rows[0];
}

export async function createReferralCode(data: schema.InsertReferralCode): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createReferralCode(data);
  const result = await getDb().insert(schema.referralCodes).values(data).returning({ id: schema.referralCodes.id });
  return result[0].id;
}

export async function trackReferral(data: schema.InsertReferralTracking): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_trackReferral(data);
  const result = await getDb().insert(schema.referralTracking).values(data).returning({ id: schema.referralTracking.id });
  return result[0].id;
}

export async function getReferralTracking(referrerId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getReferralTracking(referrerId);
  return getDb().select().from(schema.referralTracking).where(eq(schema.referralTracking.referrerId, referrerId)).orderBy(desc(schema.referralTracking.createdAt));
}

// ─── PRODUCT REVIEW HELPERS ───
export async function createProductReview(data: schema.InsertProductReview): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createProductReview(data);
  const result = await getDb().insert(schema.productReviews).values(data).returning({ id: schema.productReviews.id });
  return result[0].id;
}

export async function getProductReviews(productId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getProductReviews(productId);
  return getDb().select().from(schema.productReviews).where(eq(schema.productReviews.productId, productId)).orderBy(desc(schema.productReviews.createdAt));
}

export async function getUserReviews(userId: number) {
  if (!USE_PERSISTENT_DB) return _mem_getUserReviews(userId);
  return getDb().select().from(schema.productReviews).where(eq(schema.productReviews.userId, userId)).orderBy(desc(schema.productReviews.createdAt));
}

export async function getAllReviews(opts?: { page?: number; limit?: number }) {
  if (!USE_PERSISTENT_DB) return _mem_getAllReviews(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const data = await db.select().from(schema.productReviews).orderBy(desc(schema.productReviews.createdAt)).offset(offset).limit(limit);
  const totalResult = await db.select({ cnt: count() }).from(schema.productReviews);
  return { data, total: totalResult[0].cnt };
}

export async function approveReview(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_approveReview(id); return; }
  await getDb().update(schema.productReviews).set({ isApproved: true, updatedAt: new Date() }).where(eq(schema.productReviews.id, id));
}

export async function updateReviewPointsAwarded(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateReviewPointsAwarded(id); return; }
  await getDb().update(schema.productReviews).set({ pointsAwarded: true, updatedAt: new Date() }).where(eq(schema.productReviews.id, id));
}

export async function updateProductReview(id: number, data: Partial<schema.InsertProductReview>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updateProductReview(id, data); return; }
  await getDb().update(schema.productReviews).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.productReviews.id, id));
}

export async function deleteProductReview(id: number): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_deleteProductReview(id); return; }
  await getDb().delete(schema.productReviews).where(eq(schema.productReviews.id, id));
}

export async function getReviewById(id: number) {
  if (!USE_PERSISTENT_DB) return _mem_getReviewById(id);
  const rows = await getDb().select().from(schema.productReviews).where(eq(schema.productReviews.id, id)).limit(1);
  return rows[0];
}

// ─── STOCK MANAGEMENT ───
/**
 * Decrement stock for each item in an order. Returns array of out-of-stock item names.
 */
export async function decrementStock(items: { productId?: number; productName: string; quantity: number }[]): Promise<string[]> {
  const outOfStock: string[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const product = await getProductById(item.productId);
    if (!product) continue;
    if (product.stock < item.quantity) {
      outOfStock.push(`${item.productName} (only ${product.stock} in stock)`);
      continue;
    }
    if (USE_PERSISTENT_DB) {
      await getDb().update(schema.products).set({ stock: sql`${schema.products.stock} - ${item.quantity}`, updatedAt: new Date() }).where(eq(schema.products.id, item.productId));
    } else {
      const p = _products.find((p: any) => p.id === item.productId);
      if (p) { p.stock = Math.max(0, p.stock - item.quantity); p.updatedAt = new Date(); }
    }
  }
  return outOfStock;
}

/**
 * Check stock availability for all items. Returns array of out-of-stock item names.
 */
export async function checkStock(items: { productId?: number; productName: string; quantity: number }[]): Promise<string[]> {
  const outOfStock: string[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const product = await getProductById(item.productId);
    if (!product) continue;
    if (product.stock < item.quantity) {
      outOfStock.push(`${item.productName} (only ${product.stock} available)`);
    }
  }
  return outOfStock;
}

/**
 * Restore stock when an order is cancelled
 */
export async function restoreStock(orderId: number): Promise<void> {
  const items = await getOrderItems(orderId);
  for (const item of items) {
    if (!item.productId) continue;
    if (USE_PERSISTENT_DB) {
      await getDb().update(schema.products).set({ stock: sql`${schema.products.stock} + ${item.quantity}`, updatedAt: new Date() }).where(eq(schema.products.id, item.productId));
    } else {
      const p = _products.find((p: any) => p.id === item.productId);
      if (p) { p.stock += item.quantity; p.updatedAt = new Date(); }
    }
  }
}

/**
 * Auto-cancel unpaid orders older than 24 hours. Returns count of cancelled orders.
 */
export async function autoCancelUnpaidOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (USE_PERSISTENT_DB) {
    const db = getDb();
    const staleOrders = await db.select().from(schema.orders).where(
      and(
        eq(schema.orders.status, 'pending'),
        eq(schema.orders.paymentStatus, 'pending'),
        lte(schema.orders.createdAt, cutoff)
      )
    );
    for (const order of staleOrders) {
      await db.update(schema.orders).set({ status: 'cancelled', adminNotes: (order.adminNotes || '') + '\n[AUTO-CANCELLED] Unpaid after 24 hours.', updatedAt: new Date() } as any).where(eq(schema.orders.id, order.id));
      await restoreStock(order.id);
    }
    return staleOrders.length;
  } else {
    let cancelled = 0;
    for (const order of _orders) {
      if (order.status === 'pending' && order.paymentStatus === 'pending' && order.createdAt <= cutoff) {
        order.status = 'cancelled';
        order.adminNotes = (order.adminNotes || '') + '\n[AUTO-CANCELLED] Unpaid after 24 hours.';
        order.updatedAt = new Date();
        await restoreStock(order.id);
        cancelled++;
      }
    }
    return cancelled;
  }
}

/**
 * Award auto-earn reward points when an order is marked as delivered.
 * 1 point per $1 of the subtotal (pre-tax, pre-shipping).
 */
export async function awardOrderPoints(orderId: number): Promise<{ points: number; userId?: number } | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;
  // Already awarded? Check rewards history
  if (USE_PERSISTENT_DB) {
    const existing = await getDb().select().from(schema.rewardsHistory)
      .where(and(eq(schema.rewardsHistory.orderId, orderId), eq(schema.rewardsHistory.type, 'earned')))
      .limit(1);
    if (existing.length > 0) return null; // already awarded
  } else {
    const existing = _rewardsHistory.find((r: any) => r.orderId === orderId && r.type === 'earned');
    if (existing) return null;
  }
  // Find user by email
  if (!order.guestEmail) return null;
  const user = await getUserByEmail(order.guestEmail);
  if (!user) return null;

  const subtotal = parseFloat(order.subtotal ?? '0');
  const points = Math.floor(subtotal);
  if (points <= 0) return null;

  const newPoints = (user.rewardPoints || 0) + points;
  await updateUser(user.id, { rewardPoints: newPoints } as any);
  await addRewardsHistory({ userId: user.id, points, type: 'earned', description: `Earned ${points} points from order ${order.orderNumber}`, orderId } as any);

  return { points, userId: user.id };
}

/**
 * Check and award birthday bonus to all eligible users.
 * Awards BIRTHDAY_BONUS points once per year on the user's birthday.
 */
export async function checkBirthdayBonuses(): Promise<number> {
  const BIRTHDAY_BONUS = 100;
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const todayMD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let awarded = 0;
  if (USE_PERSISTENT_DB) {
    const db = getDb();
    // Find users whose birthday matches today (MM-DD) and haven't received this year's bonus
    const eligibleUsers = await db.select().from(schema.users).where(
      and(
        sql`${schema.users.birthday} IS NOT NULL`,
        sql`SUBSTRING(${schema.users.birthday} FROM 6) = ${todayMD}`,
        or(
          sql`${schema.users.lastBirthdayBonus} IS NULL`,
          sql`${schema.users.lastBirthdayBonus} != ${currentYear}`
        )
      )
    );
    for (const user of eligibleUsers) {
      const newPoints = (user.rewardPoints || 0) + BIRTHDAY_BONUS;
      await db.update(schema.users).set({ rewardPoints: newPoints, lastBirthdayBonus: currentYear, updatedAt: new Date() } as any).where(eq(schema.users.id, user.id));
      await addRewardsHistory({ userId: user.id, points: BIRTHDAY_BONUS, type: 'birthday' as any, description: `Happy Birthday! +${BIRTHDAY_BONUS} bonus points` } as any);
      awarded++;
    }
  } else {
    for (const user of _users) {
      if (!user.birthday) continue;
      const bMD = user.birthday.substring(5);
      if (bMD !== todayMD) continue;
      if (user.lastBirthdayBonus === currentYear) continue;
      user.rewardPoints = (user.rewardPoints || 0) + BIRTHDAY_BONUS;
      user.lastBirthdayBonus = currentYear;
      user.updatedAt = new Date();
      _rewardsHistory.push({ id: nextId(), userId: user.id, points: BIRTHDAY_BONUS, type: 'birthday', description: `Happy Birthday! +${BIRTHDAY_BONUS} bonus points`, createdAt: new Date() });
      awarded++;
    }
  }
  return awarded;
}

// ─── DASHBOARD STATS ───
export async function getDashboardStats() {
  if (!USE_PERSISTENT_DB) return _mem_getDashboardStats();
  const db = getDb();
  const [orderCount] = await db.select({ cnt: count() }).from(schema.orders);
  const [revResult] = await db.select({ total: sql<number>`COALESCE(SUM(CAST(${schema.orders.total} AS NUMERIC)), 0)` }).from(schema.orders)
    .where(or(eq(schema.orders.paymentStatus, "confirmed"), eq(schema.orders.paymentStatus, "received")));
  const [pendingV] = await db.select({ cnt: count() }).from(schema.idVerifications).where(eq(schema.idVerifications.status, "pending"));
  const [prodCount] = await db.select({ cnt: count() }).from(schema.products).where(eq(schema.products.isActive, true));
  const [userCount] = await db.select({ cnt: count() }).from(schema.users);
  const recentOrders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(10);
  return {
    totalOrders: orderCount.cnt,
    totalRevenue: Number(revResult.total),
    pendingVerifications: pendingV.cnt,
    totalProducts: prodCount.cnt,
    totalUsers: userCount.cnt,
    recentOrders,
  };
}

export async function getOrderStats(days = 30) {
  if (!USE_PERSISTENT_DB) return _mem_getOrderStats(days);
  const db = getDb();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const rows = await db.select({
    date: sql<string>`TO_CHAR(${schema.orders.createdAt}, 'YYYY-MM-DD')`,
    orderCount: count(),
    revenue: sql<string>`COALESCE(SUM(CAST(${schema.orders.total} AS NUMERIC)), 0)`,
  }).from(schema.orders).where(gte(schema.orders.createdAt, fromDate))
    .groupBy(sql`TO_CHAR(${schema.orders.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${schema.orders.createdAt}, 'YYYY-MM-DD')`);
  return rows.map(r => ({ date: r.date, orderCount: r.orderCount, revenue: String(r.revenue) }));
}

export async function getTopProducts(limit = 10) {
  if (!USE_PERSISTENT_DB) return _mem_getTopProducts(limit);
  const db = getDb();
  const rows = await db.select({
    productName: schema.orderItems.productName,
    totalSold: sql<number>`SUM(${schema.orderItems.quantity})`,
    totalRevenue: sql<string>`SUM(CAST(${schema.orderItems.price} AS NUMERIC) * ${schema.orderItems.quantity})`,
  }).from(schema.orderItems).groupBy(schema.orderItems.productName)
    .orderBy(sql`SUM(${schema.orderItems.quantity}) DESC`).limit(limit);
  return rows.map(r => ({ productName: r.productName, totalSold: Number(r.totalSold), totalRevenue: String(r.totalRevenue) }));
}

// ─── E-TRANSFER PAYMENT RECORD HELPERS ───

export async function createPaymentRecord(data: schema.InsertPaymentRecord): Promise<number> {
  if (!USE_PERSISTENT_DB) return _mem_createPaymentRecord(data);
  const result = await getDb().insert(schema.paymentRecords).values(data).returning({ id: schema.paymentRecords.id });
  return result[0].id;
}

export async function getPaymentRecordByEmailId(emailId: string) {
  if (!USE_PERSISTENT_DB) return _mem_paymentRecords.find((p: any) => p.emailId === emailId) || null;
  const rows = await getDb().select().from(schema.paymentRecords).where(eq(schema.paymentRecords.emailId, emailId)).limit(1);
  return rows[0] || null;
}

export async function getAllPaymentRecords(opts?: { page?: number; limit?: number; status?: string }) {
  if (!USE_PERSISTENT_DB) return _mem_getAllPaymentRecords(opts);
  const db = getDb();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (opts?.status) conditions.push(eq(schema.paymentRecords.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const data = await db.select().from(schema.paymentRecords).where(where).orderBy(desc(schema.paymentRecords.createdAt)).offset(offset).limit(limit);
  const [{ value: total }] = await db.select({ value: count() }).from(schema.paymentRecords).where(where);
  return { data, total };
}

export async function updatePaymentRecord(id: number, data: Partial<schema.InsertPaymentRecord>): Promise<void> {
  if (!USE_PERSISTENT_DB) { _mem_updatePaymentRecord(id, data); return; }
  await getDb().update(schema.paymentRecords).set(data as any).where(eq(schema.paymentRecords.id, id));
}

export async function getUnmatchedPaymentRecords() {
  if (!USE_PERSISTENT_DB) return _mem_paymentRecords.filter((p: any) => p.status === 'unmatched');
  return getDb().select().from(schema.paymentRecords).where(eq(schema.paymentRecords.status, 'unmatched')).orderBy(desc(schema.paymentRecords.createdAt));
}

export async function getPendingETransferOrders() {
  if (!USE_PERSISTENT_DB) return _mem_getPendingETransferOrders();
  return getDb().select().from(schema.orders)
    .where(and(eq(schema.orders.paymentStatus, 'pending'), or(eq(schema.orders.status, 'pending'), eq(schema.orders.status, 'confirmed'))))
    .orderBy(desc(schema.orders.createdAt));
}

// ========================================================================================
// SEED DATA (PostgreSQL)
// ========================================================================================
async function seedPersistentData(db: PostgresJsDatabase<typeof schema>) {
  const { seedProducts, seedShippingZones, seedEmailTemplates, seedOrders, seedVerifications } = getSeedData();

  // Admin user (primary owner)
  const [admin] = await db.insert(schema.users).values({
    openId: "admin_owner_001",
    name: "Satheeskumar Subramaniam",
    email: "k6subramaniam@gmail.com",
    phone: "+14375592056",
    phoneVerified: true,
    emailVerified: true,
    authMethod: "email",
    role: "admin",
    birthday: "1990-01-15",
    rewardPoints: 500,
    idVerified: true,
  }).returning({ id: schema.users.id });

  // Products
  for (const p of seedProducts) {
    await db.insert(schema.products).values(p);
  }

  // Shipping zones
  for (const z of seedShippingZones) {
    await db.insert(schema.shippingZones).values(z);
  }

  // Email templates
  for (const t of seedEmailTemplates) {
    await db.insert(schema.emailTemplates).values(t);
  }

  // Orders + items
  for (const o of seedOrders) {
    const [order] = await db.insert(schema.orders).values(o.order).returning({ id: schema.orders.id });
    if (o.items.length > 0) {
      await db.insert(schema.orderItems).values(o.items.map(i => ({ ...i, orderId: order.id })));
    }
  }

  // ID Verifications
  for (const v of seedVerifications) {
    await db.insert(schema.idVerifications).values(v);
  }

  console.log(`[DB] Seeded: admin user, ${seedProducts.length} products, ${seedShippingZones.length} zones, ${seedEmailTemplates.length} templates, ${seedOrders.length} orders, ${seedVerifications.length} verifications`);
}

// ========================================================================================
// SHARED SEED DATA
// ========================================================================================
function getSeedData() {
  const seedProducts: schema.InsertProduct[] = [
    { name: 'Purple Kush', slug: 'purple-kush', category: 'flower', strainType: 'Indica', price: '35.00', weight: '3.5g', thc: '22-26%', description: 'Purple Kush is a pure indica strain with earthy, sweet Kush aroma. Blissful, long-lasting euphoria blankets the mind while physical relaxation rids the body of pain, insomnia, and stress.', shortDescription: 'Pure indica with earthy, sweet Kush aroma. Deeply relaxing.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 50, featured: true, isNew: false, isActive: true, flavor: 'Earthy & Sweet' },
    { name: 'Blue Dream', slug: 'blue-dream', category: 'flower', strainType: 'Hybrid', price: '38.00', weight: '3.5g', thc: '21-28%', description: 'Blue Dream is a sativa-dominant hybrid originating in California. Crossing a Blueberry indica with Haze, Blue Dream balances full-body relaxation with gentle cerebral invigoration.', shortDescription: 'Legendary hybrid — blueberry aroma with balanced effects.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 40, featured: true, isNew: true, isActive: true, flavor: 'Blueberry & Haze' },
    { name: 'OG Kush', slug: 'og-kush', category: 'flower', strainType: 'Hybrid', price: '40.00', weight: '3.5g', thc: '20-25%', description: 'OG Kush is a legendary strain with a complex aroma featuring notes of fuel, skunk, and spice.', shortDescription: 'Legendary hybrid with fuel and spice aroma.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 35, featured: false, isNew: false, isActive: true, flavor: 'Fuel & Spice' },
    { name: 'Pink Kush', slug: 'pink-kush', category: 'flower', strainType: 'Indica', price: '45.00', weight: '3.5g', thc: '25-30%', description: 'Pink Kush is a potent indica-dominant strain with a sweet, floral aroma with vanilla undertones.', shortDescription: 'Potent indica with sweet vanilla and floral notes.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 30, featured: true, isNew: false, isActive: true, flavor: 'Sweet & Vanilla' },
    { name: 'Wedding Cake', slug: 'wedding-cake', category: 'flower', strainType: 'Hybrid', price: '42.00', weight: '3.5g', thc: '24-27%', description: 'Wedding Cake is a potent indica-hybrid with rich and tangy earthy pepper undertones.', shortDescription: 'Rich, tangy hybrid with relaxing euphoria.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 25, featured: false, isNew: false, isActive: true, flavor: 'Vanilla & Pepper' },
    { name: 'Gelato', slug: 'gelato', category: 'flower', strainType: 'Hybrid', price: '44.00', weight: '3.5g', thc: '20-25%', description: 'Gelato is a hybrid made from Sunset Sherbet and Thin Mint Girl Scout Cookies.', shortDescription: 'Sweet, fruity hybrid with euphoric relaxation.', image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=500&q=80', images: ['https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=800&q=80'], stock: 45, featured: true, isNew: true, isActive: true, flavor: 'Sweet & Fruity' },
    { name: 'Indica Pre-Roll Pack', slug: 'indica-pre-roll-pack', category: 'pre-rolls', strainType: 'Indica', price: '25.00', weight: '3x0.5g', thc: '20-24%', description: 'Three perfectly rolled 0.5g indica joints.', shortDescription: 'Three 0.5g indica joints — smooth and slow-burning.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 60, featured: true, isNew: false, isActive: true, flavor: 'Earthy & Pine' },
    { name: 'Sativa Pre-Roll Pack', slug: 'sativa-pre-roll-pack', category: 'pre-rolls', strainType: 'Sativa', price: '25.00', weight: '3x0.5g', thc: '22-26%', description: 'Three energizing sativa pre-rolls.', shortDescription: 'Three 0.5g sativa joints — energizing and uplifting.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 55, featured: false, isNew: false, isActive: true, flavor: 'Citrus & Tropical' },
    { name: 'Infused Pre-Roll King', slug: 'infused-pre-roll-king', category: 'pre-rolls', strainType: 'Hybrid', price: '18.00', weight: '1g', thc: '35-40%', description: 'A premium 1g king-size pre-roll infused with live resin concentrate and rolled in kief.', shortDescription: 'King-size infused joint — live resin + kief. Extremely potent.', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&q=80', images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80'], stock: 40, featured: true, isNew: true, isActive: true, flavor: 'Gassy & Sweet' },
    { name: 'Mixed Fruit Gummies', slug: 'mixed-fruit-gummies', category: 'edibles', strainType: 'Hybrid', price: '15.00', weight: '10 pieces', thc: '10mg/pack', description: 'Delicious mixed fruit gummies infused with 10mg THC total.', shortDescription: 'Mixed fruit gummies — 10mg THC total, 10 pieces.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 100, featured: true, isNew: false, isActive: true, flavor: 'Mixed Fruit' },
    { name: 'Dark Chocolate Bar', slug: 'dark-chocolate-bar', category: 'edibles', strainType: 'Indica', price: '12.00', weight: '1 bar', thc: '10mg/bar', description: 'Rich dark chocolate bar infused with 10mg THC.', shortDescription: 'Dark chocolate bar — 10mg THC, 10 breakable squares.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 60, featured: false, isNew: false, isActive: true, flavor: 'Dark Chocolate' },
    { name: 'THC Lemonade', slug: 'thc-lemonade', category: 'edibles', strainType: 'Hybrid', price: '8.00', weight: '355ml', thc: '10mg/bottle', description: 'Refreshing cannabis-infused lemonade with 10mg THC per bottle.', shortDescription: 'Cannabis lemonade — 10mg THC, refreshing and crisp.', image: 'https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=500&q=80', images: ['https://images.unsplash.com/photo-1611070022631-46e9ec1bc3e5?w=800&q=80'], stock: 90, featured: true, isNew: true, isActive: true, flavor: 'Lemonade' },
    { name: 'OG Kush Vape Cart', slug: 'og-kush-vape-cart', category: 'vapes', strainType: 'Hybrid', price: '45.00', weight: '1g', thc: '85-90%', description: 'Premium 1g vape cartridge filled with OG Kush distillate.', shortDescription: 'OG Kush distillate cart — 1g, 85-90% THC.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 45, featured: true, isNew: false, isActive: true, flavor: 'Fuel & Pine' },
    { name: 'Strawberry Disposable Pen', slug: 'strawberry-disposable-pen', category: 'vapes', strainType: 'Indica', price: '35.00', weight: '0.5g', thc: '80-85%', description: 'All-in-one disposable vape pen with strawberry-flavored indica distillate.', shortDescription: 'Disposable strawberry indica pen — 0.5g, ready to use.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 55, featured: false, isNew: true, isActive: true, flavor: 'Strawberry' },
    { name: 'Blue Raspberry Live Resin Cart', slug: 'blue-raspberry-live-resin-cart', category: 'vapes', strainType: 'Sativa', price: '55.00', weight: '1g', thc: '78-85%', description: 'Full-spectrum live resin cartridge.', shortDescription: 'Blue raspberry live resin cart — full-spectrum sativa.', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&q=80', images: ['https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80'], stock: 30, featured: true, isNew: true, isActive: true, flavor: 'Blue Raspberry' },
    { name: 'Live Resin — Gelato', slug: 'live-resin-gelato', category: 'concentrates', strainType: 'Hybrid', price: '50.00', weight: '1g', thc: '70-80%', description: 'Premium live resin extracted from fresh-frozen Gelato flower.', shortDescription: 'Gelato live resin — full-spectrum, golden and saucy.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 25, featured: true, isNew: false, isActive: true, flavor: 'Sweet & Creamy' },
    { name: 'THCA Diamonds', slug: 'thca-diamonds', category: 'concentrates', strainType: 'Sativa', price: '65.00', weight: '1g', thc: '90-99%', description: 'Ultra-pure THCA crystalline diamonds.', shortDescription: 'THCA diamonds — 90-99% pure, ultra-potent crystalline.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 15, featured: true, isNew: true, isActive: true, flavor: 'Citrus & Terpene' },
    { name: 'Bubble Hash', slug: 'bubble-hash', category: 'concentrates', strainType: 'Indica', price: '35.00', weight: '1g', thc: '50-65%', description: 'Traditional ice-water extracted bubble hash.', shortDescription: 'Full-melt bubble hash — traditional, earthy, smooth.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80', images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'], stock: 30, featured: false, isNew: false, isActive: true, flavor: 'Earthy & Hash' },
    { name: 'Premium Grinder', slug: 'premium-grinder', category: 'accessories', strainType: 'N/A', price: '25.00', weight: '1 unit', thc: 'N/A', description: 'Heavy-duty 4-piece aluminum grinder with kief catcher.', shortDescription: '4-piece aluminum grinder with kief catcher.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 80, featured: false, isNew: false, isActive: true, flavor: 'N/A' },
    { name: 'Glass Water Pipe', slug: 'glass-water-pipe', category: 'accessories', strainType: 'N/A', price: '75.00', weight: '1 unit', thc: 'N/A', description: 'Hand-blown borosilicate glass water pipe with ice catcher and percolator.', shortDescription: '12" glass water pipe with ice catcher and perc.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 15, featured: true, isNew: false, isActive: true, flavor: 'N/A' },
    { name: '510 Thread Battery', slug: '510-thread-battery', category: 'accessories', strainType: 'N/A', price: '20.00', weight: '1 unit', thc: 'N/A', description: 'Slim, discreet 510-thread vape battery with variable voltage.', shortDescription: 'Variable voltage 510 battery — slim, USB-C rechargeable.', image: 'https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=500&q=80', images: ['https://images.unsplash.com/photo-1585063560381-04b76b4d5a8f?w=800&q=80'], stock: 60, featured: false, isNew: true, isActive: true, flavor: 'N/A' },
  ];

  const seedShippingZones: schema.InsertShippingZone[] = [
    { zoneName: 'Ontario', provinces: ['ON'], rate: '9.99', freeThreshold: '150.00', estimatedDays: '2-3', deliveryDays: '2-3', isActive: true },
    { zoneName: 'Quebec', provinces: ['QC'], rate: '12.99', freeThreshold: '150.00', estimatedDays: '3-5', deliveryDays: '3-5', isActive: true },
    { zoneName: 'British Columbia', provinces: ['BC'], rate: '14.99', freeThreshold: '150.00', estimatedDays: '5-7', deliveryDays: '5-7', isActive: true },
    { zoneName: 'Alberta', provinces: ['AB'], rate: '12.99', freeThreshold: '150.00', estimatedDays: '4-6', deliveryDays: '4-6', isActive: true },
    { zoneName: 'Rest of Canada', provinces: ['MB','SK','NS','NB','NL','PE','NT','YT','NU'], rate: '16.99', freeThreshold: '175.00', estimatedDays: '7-10', deliveryDays: '7-10', isActive: true },
  ];

  // All 13 email templates converted from WordPress PHP originals
  const seedEmailTemplates: schema.InsertEmailTemplate[] = EMAIL_TEMPLATE_SEEDS.map(t => ({
    slug: t.slug,
    name: t.name,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    variables: t.variables,
    isActive: t.isActive,
  }));

  const seedOrders: Array<{ order: schema.InsertOrder; items: Omit<schema.InsertOrderItem, 'orderId'>[] }> = [
    { order: { orderNumber: 'ORD-2024-001', status: 'delivered', paymentStatus: 'confirmed', total: '83.00', subtotal: '83.00', shippingCost: '9.99', discount: '0', guestName: 'John Smith', guestEmail: 'john@example.com', shippingAddress: { street: '123 Main St', city: 'Toronto', province: 'ON', postalCode: 'M5H 2N2', country: 'Canada' }, trackingNumber: 'TRKEXAMPLE001' }, items: [{ productName: 'Blue Dream', price: '38.00', quantity: 1 }, { productName: 'Indica Pre-Roll Pack', price: '25.00', quantity: 1 }, { productName: 'Premium Grinder', price: '25.00', quantity: 1 }] },
    { order: { orderNumber: 'ORD-2024-002', status: 'shipped', paymentStatus: 'confirmed', total: '127.00', subtotal: '127.00', shippingCost: '9.99', discount: '0', guestName: 'Sarah Johnson', guestEmail: 'sarah@example.com', shippingAddress: { street: '456 Queen St', city: 'Mississauga', province: 'ON', postalCode: 'L5B 1M4', country: 'Canada' }, trackingNumber: 'TRKEXAMPLE002' }, items: [{ productName: 'OG Kush Vape Cart', price: '45.00', quantity: 2 }, { productName: 'Mixed Fruit Gummies', price: '15.00', quantity: 1 }, { productName: 'Dark Chocolate Bar', price: '12.00', quantity: 1 }] },
    { order: { orderNumber: 'ORD-2024-003', status: 'pending', paymentStatus: 'pending', total: '55.00', subtotal: '55.00', shippingCost: '9.99', discount: '0', guestName: 'Mike Williams', guestEmail: 'mike@example.com', shippingAddress: { street: '789 King Ave', city: 'Ottawa', province: 'ON', postalCode: 'K1A 0A6', country: 'Canada' } }, items: [{ productName: 'Purple Kush', price: '35.00', quantity: 1 }, { productName: 'Sativa Pre-Roll Pack', price: '25.00', quantity: 1 }] },
    { order: { orderNumber: 'ORD-2024-004', status: 'confirmed', paymentStatus: 'confirmed', total: '210.00', subtotal: '210.00', shippingCost: '9.99', discount: '0', guestName: 'Emily Davis', guestEmail: 'emily@example.com', shippingAddress: { street: '321 Bay St', city: 'Brampton', province: 'ON', postalCode: 'L6Y 4W2', country: 'Canada' } }, items: [{ productName: 'THCA Diamonds', price: '65.00', quantity: 2 }, { productName: 'Live Resin — Gelato', price: '50.00', quantity: 1 }, { productName: 'Glass Water Pipe', price: '75.00', quantity: 1 }] },
    { order: { orderNumber: 'ORD-2024-005', status: 'delivered', paymentStatus: 'confirmed', total: '95.00', subtotal: '95.00', shippingCost: '9.99', discount: '0', guestName: 'David Chen', guestEmail: 'david@example.com', shippingAddress: { street: '654 Yonge St', city: 'North York', province: 'ON', postalCode: 'M2M 3S3', country: 'Canada' }, trackingNumber: 'TRKEXAMPLE005' }, items: [{ productName: 'Gelato', price: '44.00', quantity: 1 }, { productName: 'Blue Raspberry Live Resin Cart', price: '55.00', quantity: 1 }] },
  ];

  const seedVerifications: schema.InsertIdVerification[] = [
    { guestEmail: 'john@example.com', guestName: 'John Smith', frontImageUrl: '', idType: 'drivers_license', status: 'approved', reviewedBy: 1, reviewedAt: new Date(Date.now() - 10 * 86400000), reviewNotes: 'Valid Ontario DL confirmed' },
    { guestEmail: 'sarah@example.com', guestName: 'Sarah Johnson', frontImageUrl: '', idType: 'passport', status: 'approved', reviewedBy: 1, reviewedAt: new Date(Date.now() - 8 * 86400000), reviewNotes: 'Valid Canadian passport' },
    { guestEmail: 'mike@example.com', guestName: 'Mike Williams', frontImageUrl: '', idType: 'drivers_license', status: 'pending' },
  ];

  return { seedProducts, seedShippingZones, seedEmailTemplates, seedOrders, seedVerifications };
}


// ========================================================================================
// IN-MEMORY FALLBACK (when DATABASE_URL is not set)
// ========================================================================================

let _nextId = 1;
function nextId() { return _nextId++; }
const _users: any[] = [];
const _products: any[] = [];
const _orders: any[] = [];
const _orderItems: any[] = [];
const _idVerifications: any[] = [];
const _shippingZones: any[] = [];
const _emailTemplates: any[] = [];
const _adminActivityLog: any[] = [];
const _rewardsHistory: any[] = [];
const _verificationCodes: any[] = [];
const _coupons: any[] = [];
const _couponUsage: any[] = [];
const _referralCodes: any[] = [];
const _referralTracking: any[] = [];
const _productReviews: any[] = [];
const _siteSettings: any[] = [
  { id: 1, key: 'id_verification_enabled', value: 'true', updatedAt: new Date() },
  { id: 2, key: 'maintenance_mode_enabled', value: 'false', updatedAt: new Date() },
  { id: 3, key: 'maintenance_title', value: "We'll Be Right Back", updatedAt: new Date() },
  { id: 4, key: 'maintenance_message', value: 'Our store is currently undergoing scheduled maintenance. We appreciate your patience and will be back online shortly. Please check back soon!', updatedAt: new Date() },
  { id: 5, key: 'store_hours', value: JSON.stringify({ monday: { open: '10:00', close: '22:00', closed: false }, tuesday: { open: '10:00', close: '22:00', closed: false }, wednesday: { open: '10:00', close: '22:00', closed: false }, thursday: { open: '10:00', close: '22:00', closed: false }, friday: { open: '10:00', close: '23:00', closed: false }, saturday: { open: '10:00', close: '23:00', closed: false }, sunday: { open: '11:00', close: '21:00', closed: false } }), updatedAt: new Date() },
  { id: 6, key: 'store_hours_enabled', value: 'true', updatedAt: new Date() },
  { id: 7, key: 'store_hours_note', value: 'Orders placed outside business hours will be processed on the next business day.', updatedAt: new Date() },
];

function paginate<T>(arr: T[], page: number, limit: number) {
  const offset = (page - 1) * limit;
  return arr.slice(offset, offset + limit);
}

function seedInMemoryData() {
  const now = new Date();
  const { seedProducts, seedShippingZones, seedEmailTemplates, seedOrders, seedVerifications } = getSeedData();

  for (const p of seedProducts) {
    _products.push({ id: nextId(), ...p, rewardPoints: 0, createdAt: now, updatedAt: now });
  }
  for (const z of seedShippingZones) {
    _shippingZones.push({ id: nextId(), ...z, createdAt: now, updatedAt: now });
  }
  for (const t of seedEmailTemplates) {
    _emailTemplates.push({ id: nextId(), ...t, createdAt: now, updatedAt: now });
  }

  const adminId = nextId();
  _users.push({
    id: adminId, openId: 'admin_owner_001', name: 'Satheeskumar Subramaniam', email: 'k6subramaniam@gmail.com',
    phone: '+14375592056', phoneVerified: true, emailVerified: true, googleId: null,
    authMethod: 'email', loginMethod: 'email', role: 'admin', birthday: '1990-01-15',
    rewardPoints: 500, idVerified: true, isLocked: false, adminNotes: null,
    createdAt: now, updatedAt: now, lastSignedIn: now,
  });

  for (const o of seedOrders) {
    const orderId = nextId();
    const createdDate = new Date(now.getTime() - Math.random() * 30 * 86400000);
    _orders.push({
      id: orderId, ...o.order, tax: '0.00', shipping: '9.99', billingAddress: null,
      createdAt: createdDate, updatedAt: createdDate,
    });
    for (const item of o.items) {
      _orderItems.push({ id: nextId(), orderId, ...item, productImage: null, productId: null, createdAt: createdDate });
    }
  }

  for (const v of seedVerifications) {
    _idVerifications.push({
      id: nextId(), ...v, selfieImageUrl: undefined,
      createdAt: new Date(now.getTime() - Math.random() * 15 * 86400000), updatedAt: new Date(),
    });
  }

  console.log(`[DB] In-memory: ${_products.length} products, ${_shippingZones.length} zones, ${_orders.length} orders, ${_idVerifications.length} verifications`);
}

// ─── IN-MEMORY STUBS ───
function _mem_upsertUser(user: any) {
  const existing = _users.find(u => u.openId === user.openId);
  const now = new Date();
  if (existing) {
    for (const k of Object.keys(user)) { if (user[k] !== undefined) (existing as any)[k] = user[k]; }
    existing.updatedAt = now;
  } else {
    _users.push({ id: nextId(), isLocked: false, adminNotes: null, createdAt: now, updatedAt: now, lastSignedIn: now, ...user });
  }
}
function _mem_getUserByOpenId(openId: string) { return _users.find(u => u.openId === openId); }
function _mem_getUserByEmail(email: string) { return _users.find(u => u.email?.toLowerCase() === email.toLowerCase()); }
function _mem_getUserByPhone(phone: string) { return _users.find(u => u.phone === phone); }
function _mem_getUserByGoogleId(googleId: string) { return _users.find(u => u.googleId === googleId); }
function _mem_getUserById(id: number) { return _users.find(u => u.id === id); }
function _mem_getAllUsers(page = 1, limit = 50, search?: string) {
  let list = [..._users];
  if (search) { const q = search.toLowerCase(); list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q)); }
  const sorted = list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { data: paginate(sorted, page, limit), total: sorted.length };
}
function _mem_updateUser(id: number, data: any) { const u = _users.find(u => u.id === id); if (u) Object.assign(u, data, { updatedAt: new Date() }); }
function _mem_deleteUser(id: number) { const idx = _users.findIndex(u => u.id === id); if (idx !== -1) _users.splice(idx, 1); }
function _mem_getUserOrders(userId: number) {
  const user = _users.find(u => u.id === userId);
  if (!user) return [];
  return _orders.filter((o: any) => (user.email && o.guestEmail?.toLowerCase() === user.email.toLowerCase()) || (user.phone && o.guestPhone === user.phone))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
}
function _mem_createVerificationCode(data: any) { const id = nextId(); _verificationCodes.push({ id, ...data, attempts: 0, verified: false, createdAt: new Date() }); return id; }
function _mem_verifyCode(identifier: string, code: string, type: string) {
  const records = _verificationCodes.filter(c => c.identifier === identifier && c.type === type && !c.verified).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (!records.length) return { valid: false, reason: 'No verification code found.' };
  const r = records[0];
  if (new Date() > r.expiresAt) { r.verified = true; return { valid: false, reason: 'Code has expired.' }; }
  if (r.attempts >= 5) { r.verified = true; return { valid: false, reason: 'Too many attempts.' }; }
  if (r.code !== code) { r.attempts++; return { valid: false, reason: `Incorrect code. ${4 - r.attempts} attempts remaining.` }; }
  r.verified = true;
  return { valid: true };
}
function _mem_getAllProducts(opts?: any) {
  let filtered = [..._products];
  if (opts?.category) filtered = filtered.filter(p => p.category === opts.category);
  if (opts?.activeOnly) filtered = filtered.filter(p => p.isActive);
  if (opts?.search) { const s = opts.search.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s)); }
  const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { data: paginate(sorted, opts?.page ?? 1, opts?.limit ?? 50), total: sorted.length };
}
function _mem_getProductById(id: number) { return _products.find(p => p.id === id); }
function _mem_getProductBySlug(slug: string) { return _products.find(p => p.slug === slug); }
function _mem_createProduct(data: any) { const id = nextId(); const now = new Date(); _products.push({ id, ...data, stock: data.stock ?? 0, featured: data.featured ?? false, isNew: data.isNew ?? false, isActive: data.isActive ?? true, rewardPoints: 0, createdAt: now, updatedAt: now }); return id; }
function _mem_updateProduct(id: number, data: any) { const p = _products.find(p => p.id === id); if (p) Object.assign(p, data, { updatedAt: new Date() }); }
function _mem_deleteProduct(id: number) { const idx = _products.findIndex(p => p.id === id); if (idx !== -1) _products.splice(idx, 1); }
function _mem_getAllOrders(opts?: any) {
  let filtered = [..._orders];
  if (opts?.status) filtered = filtered.filter(o => o.status === opts.status);
  if (opts?.search) { const s = opts.search.toLowerCase(); filtered = filtered.filter(o => o.orderNumber.toLowerCase().includes(s) || (o.guestEmail ?? '').toLowerCase().includes(s) || (o.guestName ?? '').toLowerCase().includes(s)); }
  if (opts?.dateFrom) filtered = filtered.filter(o => o.createdAt >= opts.dateFrom);
  if (opts?.dateTo) filtered = filtered.filter(o => o.createdAt <= opts.dateTo);
  const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { data: paginate(sorted, opts?.page ?? 1, opts?.limit ?? 50), total: sorted.length };
}
function _mem_getOrderById(id: number) { return _orders.find(o => o.id === id); }
function _mem_getOrderItems(orderId: number) { return _orderItems.filter(i => i.orderId === orderId); }
function _mem_createOrder(data: any) { const id = nextId(); _orders.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_createOrderItems(items: any[]) { for (const item of items) _orderItems.push({ id: nextId(), ...item, createdAt: new Date() }); }
function _mem_updateOrder(id: number, data: any) { const o = _orders.find(o => o.id === id); if (o) Object.assign(o, data, { updatedAt: new Date() }); }
function _mem_getAllVerifications(opts?: any) {
  const allNorm = _idVerifications.map((v: any) => ({ ...v, status: v.status || 'pending' }));
  let filtered = [...allNorm];
  if (opts?.status) filtered = filtered.filter(v => v.status === opts.status);
  if (opts?.email) filtered = filtered.filter((v: any) => (v.guestEmail || '').toLowerCase() === opts.email.toLowerCase());
  const sorted = filtered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  return { data: paginate(sorted, opts?.page ?? 1, opts?.limit ?? 50), total: sorted.length };
}
function _mem_getVerificationById(id: number) { const v = _idVerifications.find((v: any) => v.id === id); return v ? { ...v, status: v.status || 'pending' } : undefined; }
function _mem_createVerification(data: any) { const id = nextId(); _idVerifications.push({ id, status: 'pending', ...data, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_updateVerification(id: number, data: any) { const v = _idVerifications.find((v: any) => v.id === id); if (v) Object.assign(v, data, { updatedAt: new Date() }); }
function _mem_getAllShippingZones() { return [..._shippingZones].sort((a: any, b: any) => a.id - b.id); }
function _mem_updateShippingZone(id: number, data: any) { const z = _shippingZones.find((z: any) => z.id === id); if (z) Object.assign(z, data, { updatedAt: new Date() }); }
function _mem_createShippingZone(data: any) { const id = nextId(); _shippingZones.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_getAllEmailTemplates() { return [..._emailTemplates].sort((a: any, b: any) => a.slug.localeCompare(b.slug)); }
function _mem_getEmailTemplateBySlug(slug: string) { return _emailTemplates.find((t: any) => t.slug === slug); }
function _mem_updateEmailTemplate(id: number, data: any) { const t = _emailTemplates.find((t: any) => t.id === id); if (t) Object.assign(t, data, { updatedAt: new Date() }); }
function _mem_createEmailTemplate(data: any) { const id = nextId(); _emailTemplates.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_logAdminActivity(data: any) { _adminActivityLog.push({ id: nextId(), ...data, createdAt: new Date() }); }
function _mem_getAdminActivityLog(opts?: any) { const sorted = [..._adminActivityLog].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); return { data: paginate(sorted, opts?.page ?? 1, opts?.limit ?? 50), total: sorted.length }; }
function _mem_addRewardsHistory(data: any) { _rewardsHistory.push({ id: nextId(), ...data, createdAt: new Date() }); }
function _mem_getRewardsHistoryByUser(userId: number) { return [..._rewardsHistory].filter((r: any) => r.userId === userId).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }
function _mem_getDashboardStats() {
  return {
    totalOrders: _orders.length,
    totalRevenue: _orders.filter(o => o.paymentStatus === 'confirmed' || o.paymentStatus === 'received').reduce((sum, o) => sum + parseFloat(o.total ?? '0'), 0),
    pendingVerifications: _idVerifications.filter((v: any) => !v.status || v.status === 'pending').length,
    totalProducts: _products.filter(p => p.isActive).length,
    totalUsers: _users.length,
    recentOrders: [..._orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  };
}
function _mem_getOrderStats(days = 30) {
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - days);
  const filtered = _orders.filter(o => o.createdAt >= fromDate);
  const byDate = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of filtered) { const date = o.createdAt.toISOString().split('T')[0]; const ex = byDate.get(date) ?? { orderCount: 0, revenue: 0 }; ex.orderCount++; ex.revenue += parseFloat(o.total ?? '0'); byDate.set(date, ex); }
  return Array.from(byDate.entries()).map(([date, s]) => ({ date, orderCount: s.orderCount, revenue: String(s.revenue) })).sort((a, b) => a.date.localeCompare(b.date));
}
function _mem_getTopProducts(limit = 10) {
  const byProd = new Map<string, { totalSold: number; totalRevenue: number }>();
  for (const i of _orderItems) { const ex = byProd.get(i.productName) ?? { totalSold: 0, totalRevenue: 0 }; ex.totalSold += i.quantity; ex.totalRevenue += parseFloat(i.price ?? '0') * i.quantity; byProd.set(i.productName, ex); }
  return Array.from(byProd.entries()).map(([productName, s]) => ({ productName, totalSold: s.totalSold, totalRevenue: String(s.totalRevenue) })).sort((a, b) => b.totalSold - a.totalSold).slice(0, limit);
}

// ─── IN-MEMORY COUPON STUBS ───
function _mem_getAllCoupons() { return [..._coupons].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }
function _mem_getCouponByCode(code: string) { return _coupons.find((c: any) => c.code.toUpperCase() === code.toUpperCase()); }
function _mem_getCouponById(id: number) { return _coupons.find((c: any) => c.id === id); }
function _mem_createCoupon(data: any) { const id = nextId(); _coupons.push({ id, ...data, usageCount: 0, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_updateCoupon(id: number, data: any) { const c = _coupons.find((c: any) => c.id === id); if (c) Object.assign(c, data, { updatedAt: new Date() }); }
function _mem_deleteCoupon(id: number) { const idx = _coupons.findIndex((c: any) => c.id === id); if (idx !== -1) _coupons.splice(idx, 1); }
function _mem_getCouponUsageByEmail(couponId: number, email: string) { return _couponUsage.filter((u: any) => u.couponId === couponId && u.email.toLowerCase() === email.toLowerCase()).length; }
function _mem_recordCouponUsage(data: any) { _couponUsage.push({ id: nextId(), ...data, createdAt: new Date() }); const c = _coupons.find((c: any) => c.id === data.couponId); if (c) c.usageCount = (c.usageCount || 0) + 1; }

// ─── IN-MEMORY REFERRAL STUBS ───
function _mem_getReferralCodeByUserId(userId: number) { return _referralCodes.find((r: any) => r.userId === userId); }
function _mem_getReferralCodeByCode(code: string) { return _referralCodes.find((r: any) => r.code.toUpperCase() === code.toUpperCase()); }
function _mem_createReferralCode(data: any) { const id = nextId(); _referralCodes.push({ id, ...data, timesUsed: 0, createdAt: new Date() }); return id; }
function _mem_trackReferral(data: any) { const id = nextId(); _referralTracking.push({ id, ...data, createdAt: new Date() }); return id; }
function _mem_getReferralTracking(referrerId: number) { return [..._referralTracking].filter((r: any) => r.referrerId === referrerId).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }

// ─── IN-MEMORY REVIEW STUBS ───
function _mem_createProductReview(data: any) { const id = nextId(); _productReviews.push({ id, ...data, isApproved: true, pointsAwarded: false, createdAt: new Date(), updatedAt: new Date() }); return id; }
function _mem_getProductReviews(productId: number) { return _productReviews.filter((r: any) => r.productId === productId).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }
function _mem_getUserReviews(userId: number) { return _productReviews.filter((r: any) => r.userId === userId).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }
function _mem_getAllReviews(opts?: any) { const sorted = [..._productReviews].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); return { data: paginate(sorted, opts?.page ?? 1, opts?.limit ?? 50), total: sorted.length }; }
function _mem_approveReview(id: number) { const r = _productReviews.find((r: any) => r.id === id); if (r) { r.isApproved = true; r.updatedAt = new Date(); } }
function _mem_updateReviewPointsAwarded(id: number) { const r = _productReviews.find((r: any) => r.id === id); if (r) { r.pointsAwarded = true; r.updatedAt = new Date(); } }
function _mem_updateProductReview(id: number, data: any) { const r = _productReviews.find((r: any) => r.id === id); if (r) Object.assign(r, data, { updatedAt: new Date() }); }
function _mem_deleteProductReview(id: number) { const idx = _productReviews.findIndex((r: any) => r.id === id); if (idx !== -1) _productReviews.splice(idx, 1); }
function _mem_getReviewById(id: number) { return _productReviews.find((r: any) => r.id === id); }

// ─── IN-MEMORY E-TRANSFER PAYMENT STUBS ───
const _mem_paymentRecords: any[] = [];
function _mem_createPaymentRecord(data: any) { const id = nextId(); _mem_paymentRecords.push({ id, ...data, createdAt: new Date() }); return id; }
function _mem_getAllPaymentRecords(opts?: any) { const sorted = [..._mem_paymentRecords].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); const filtered = opts?.status ? sorted.filter((p: any) => p.status === opts.status) : sorted; return { data: paginate(filtered, opts?.page ?? 1, opts?.limit ?? 50), total: filtered.length }; }
function _mem_updatePaymentRecord(id: number, data: any) { const r = _mem_paymentRecords.find((p: any) => p.id === id); if (r) Object.assign(r, data); }
function _mem_getPendingETransferOrders() { return [..._orders].filter(o => o.paymentStatus === 'pending' && (o.status === 'pending' || o.status === 'confirmed')).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); }
