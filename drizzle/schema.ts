import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  json,
  serial,
} from "drizzle-orm/pg-core";

// ─── ENUMS ───
export const authMethodEnum = pgEnum("auth_method", ["phone", "email", "google"]);
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const verificationCodeTypeEnum = pgEnum("verification_code_type", ["sms", "email"]);
export const verificationCodePurposeEnum = pgEnum("verification_code_purpose", ["login", "register", "verify"]);
export const productCategoryEnum = pgEnum("product_category", [
  "flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories", "ounce-deals", "shake-n-bake",
]);
export const strainTypeEnum = pgEnum("strain_type", ["Sativa", "Indica", "Hybrid", "CBD", "N/A"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "received", "confirmed", "partially_refunded", "refunded",
]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const rewardsTypeEnum = pgEnum("rewards_type", ["earned", "redeemed", "bonus", "deducted", "admin_add", "admin_deduct", "birthday", "referral", "review"]);

export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed_amount", "free_shipping"]);

// ─── USERS ───
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  googleId: varchar("google_id", { length: 255 }),
  authMethod: authMethodEnum("auth_method").default("email"),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  birthday: varchar("birthday", { length: 10 }),
  rewardPoints: integer("reward_points").default(0).notNull(),
  idVerified: boolean("id_verified").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  adminNotes: text("admin_notes"),
  referredBy: integer("referred_by"),
  referralCode: varchar("referral_code", { length: 20 }),
  lastBirthdayBonus: varchar("last_birthday_bonus", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── VERIFICATION CODES (OTP) ───
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  type: verificationCodeTypeEnum("type").notNull(),
  purpose: verificationCodePurposeEnum("purpose").default("login").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

// ─── PRODUCTS ───
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  category: productCategoryEnum("category").notNull(),
  strainType: strainTypeEnum("strain_type").default("Hybrid"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  weight: varchar("weight", { length: 50 }),
  thc: varchar("thc", { length: 50 }),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  image: text("image"),
  images: json("images").$type<string[]>(),
  stock: integer("stock").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  flavor: varchar("flavor", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  grade: varchar("grade", { length: 20 }),
  rewardPoints: integer("reward_points").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── ORDERS ───
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  userId: integer("user_id"),
  guestEmail: varchar("guest_email", { length: 320 }),
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  pointsRedeemed: integer("points_redeemed").default(0).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: json("shipping_address").$type<{
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  }>(),
  shippingZone: varchar("shipping_zone", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingUrl: text("tracking_url"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  couponCode: varchar("coupon_code", { length: 50 }),
  couponDiscount: numeric("coupon_discount", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── ORDER ITEMS ───
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id"),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── ID VERIFICATIONS ───
export const idVerifications = pgTable("id_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  guestEmail: varchar("guest_email", { length: 320 }),
  guestName: varchar("guest_name", { length: 255 }),
  frontImageUrl: text("front_image_url").notNull(),
  selfieImageUrl: text("selfie_image_url"),
  idType: varchar("id_type", { length: 100 }),
  status: verificationStatusEnum("status").default("pending").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IdVerification = typeof idVerifications.$inferSelect;
export type InsertIdVerification = typeof idVerifications.$inferInsert;

// ─── SHIPPING ZONES ───
export const shippingZones = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  zoneName: varchar("zone_name", { length: 100 }).notNull(),
  provinces: json("provinces").$type<string[]>().notNull(),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  freeThreshold: numeric("free_threshold", { precision: 10, scale: 2 }),
  estimatedDays: varchar("estimated_days", { length: 50 }),
  deliveryDays: varchar("delivery_days", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ShippingZone = typeof shippingZones.$inferSelect;
export type InsertShippingZone = typeof shippingZones.$inferInsert;

// ─── EMAIL TEMPLATES ───
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  variables: json("variables").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// ─── ADMIN ACTIVITY LOG ───
export const adminActivityLog = pgTable("admin_activity_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  adminName: varchar("admin_name", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
export type InsertAdminActivityLog = typeof adminActivityLog.$inferInsert;

// ─── REWARDS HISTORY ───
export const rewardsHistory = pgTable("rewards_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: rewardsTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  orderId: integer("order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RewardsHistory = typeof rewardsHistory.$inferSelect;
export type InsertRewardsHistory = typeof rewardsHistory.$inferInsert;

// ─── COUPONS ───
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: couponTypeEnum("type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  perUserLimit: integer("per_user_limit").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ─── COUPON USAGE TRACKING ───
export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull(),
  orderId: integer("order_id"),
  email: varchar("email", { length: 320 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = typeof couponUsage.$inferInsert;

// ─── REFERRAL CODES ───
export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  timesUsed: integer("times_used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

// ─── REFERRAL TRACKING ───
export const referralTracking = pgTable("referral_tracking", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  refereeId: integer("referee_id").notNull(),
  referralCodeId: integer("referral_code_id").notNull(),
  referrerPointsAwarded: boolean("referrer_points_awarded").default(false).notNull(),
  refereePointsAwarded: boolean("referee_points_awarded").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = typeof referralTracking.$inferInsert;

// ─── PRODUCT REVIEWS (with structured tags for recommendation signals) ───
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  orderId: integer("order_id"),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  // ── Structured recommendation tags (JSON arrays of string tags) ──
  // These capture how customers actually describe their experience,
  // forming the basis for future AI-powered recommendations.
  tags: json("tags").$type<string[]>(),           // e.g. ["smooth","relaxing","good-value"]
  strengthRating: integer("strength_rating"),       // 1-5 (1=mild, 5=very strong)
  smoothnessRating: integer("smoothness_rating"),   // 1-5 (1=harsh, 5=very smooth)
  effectTags: json("effect_tags").$type<string[]>(), // e.g. ["relaxing","sleepy","euphoric","focused","creative","social","pain-relief","anxiety-relief"]
  experienceLevel: varchar("experience_level", { length: 20 }), // "beginner", "intermediate", "experienced"
  usageTiming: varchar("usage_timing", { length: 20 }),         // "daytime", "nighttime", "anytime"
  wouldRecommend: boolean("would_recommend"),
  // ── Moderation & rewards ──
  isApproved: boolean("is_approved").default(true).notNull(),
  pointsAwarded: boolean("points_awarded").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = typeof productReviews.$inferInsert;

// ─── STORE LOCATIONS (admin-manageable) ───
export const storeLocations = pgTable("store_locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  province: varchar("province", { length: 10 }).notNull(),
  postalCode: varchar("postal_code", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  hours: varchar("hours", { length: 100 }).default("Open 24/7").notNull(),
  mapUrl: text("map_url"),
  directionsUrl: text("directions_url"),
  lat: numeric("lat", { precision: 10, scale: 6 }),
  lng: numeric("lng", { precision: 10, scale: 6 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StoreLocation = typeof storeLocations.$inferSelect;
export type InsertStoreLocation = typeof storeLocations.$inferInsert;

// ─── SITE SETTINGS ───
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

// ─── E-TRANSFER PAYMENT RECORDS ───
export const etransferMatchConfidenceEnum = pgEnum("etransfer_match_confidence", ["exact", "high", "low", "none"]);
export const etransferStatusEnum = pgEnum("etransfer_status", ["auto_matched", "manual_matched", "unmatched", "ignored"]);

export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  emailId: varchar("email_id", { length: 255 }).notNull().unique(), // Gmail message ID (dedup)
  senderName: varchar("sender_name", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 320 }),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  memo: text("memo"),
  rawSubject: varchar("raw_subject", { length: 500 }),
  rawBodySnippet: text("raw_body_snippet"),       // first 500 chars for debugging
  receivedAt: timestamp("received_at"),
  matchedOrderId: integer("matched_order_id"),
  matchedOrderNumber: varchar("matched_order_number", { length: 30 }),
  matchConfidence: etransferMatchConfidenceEnum("match_confidence").default("none"),
  matchMethod: varchar("match_method", { length: 100 }),  // "memo_order_number", "exact_amount", "amount_name", "manual"
  status: etransferStatusEnum("status").default("unmatched").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;

// ─── PERSISTENT FILE STORE ───
// Stores uploaded file data in the database so files survive container deploys.
// On server startup, files are materialized to dist/public/uploads/ from DB.
export const fileStore = pgTable("file_store", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),     // e.g. "uploads/site-logo.png"
  contentType: varchar("content_type", { length: 100 }).notNull(),
  data: text("data").notNull(),                                  // base64-encoded file contents
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FileStoreEntry = typeof fileStore.$inferSelect;
export type InsertFileStoreEntry = typeof fileStore.$inferInsert;
