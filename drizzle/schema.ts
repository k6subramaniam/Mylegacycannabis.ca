import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── USERS ───
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  googleId: varchar("googleId", { length: 255 }),
  authMethod: mysqlEnum("authMethod", ["phone", "email", "google"]).default("email"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  birthday: varchar("birthday", { length: 10 }),
  rewardPoints: int("rewardPoints").default(0).notNull(),
  idVerified: boolean("idVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── VERIFICATION CODES (OTP) ───
export const verificationCodes = mysqlTable("verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  identifier: varchar("identifier", { length: 320 }).notNull(), // phone or email
  code: varchar("code", { length: 6 }).notNull(),
  type: mysqlEnum("type", ["sms", "email"]).notNull(),
  purpose: mysqlEnum("purpose", ["login", "register", "verify"]).default("login").notNull(),
  attempts: int("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

// ─── PRODUCTS ───
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  category: mysqlEnum("category", [
    "flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories",
  ]).notNull(),
  strainType: mysqlEnum("strainType", ["Sativa", "Indica", "Hybrid", "CBD", "N/A"]).default("Hybrid"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  weight: varchar("weight", { length: 50 }),
  thc: varchar("thc", { length: 50 }),
  description: text("description"),
  shortDescription: varchar("shortDescription", { length: 500 }),
  image: text("image"),
  images: json("images").$type<string[]>(),
  stock: int("stock").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  isNew: boolean("isNew").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  flavor: varchar("flavor", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── ORDERS ───
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  userId: int("userId"),
  guestEmail: varchar("guestEmail", { length: 320 }),
  guestName: varchar("guestName", { length: 255 }),
  guestPhone: varchar("guestPhone", { length: 20 }),
  status: mysqlEnum("status", [
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
  ]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", [
    "pending", "received", "confirmed", "refunded",
  ]).default("pending").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  pointsRedeemed: int("pointsRedeemed").default(0).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: json("shippingAddress").$type<{
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  }>(),
  shippingZone: varchar("shippingZone", { length: 50 }),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  trackingUrl: text("trackingUrl"),
  notes: text("notes"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── ORDER ITEMS ───
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 255 }).notNull(),
  productImage: text("productImage"),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── ID VERIFICATIONS ───
export const idVerifications = mysqlTable("id_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  guestEmail: varchar("guestEmail", { length: 320 }),
  guestName: varchar("guestName", { length: 255 }),
  frontImageUrl: text("frontImageUrl").notNull(),
  selfieImageUrl: text("selfieImageUrl"),
  idType: varchar("idType", { length: 100 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IdVerification = typeof idVerifications.$inferSelect;
export type InsertIdVerification = typeof idVerifications.$inferInsert;

// ─── SHIPPING ZONES ───
export const shippingZones = mysqlTable("shipping_zones", {
  id: int("id").autoincrement().primaryKey(),
  zoneName: varchar("zoneName", { length: 100 }).notNull(),
  provinces: json("provinces").$type<string[]>().notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: varchar("deliveryDays", { length: 50 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShippingZone = typeof shippingZones.$inferSelect;
export type InsertShippingZone = typeof shippingZones.$inferInsert;

// ─── EMAIL TEMPLATES ───
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  variables: json("variables").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// ─── ADMIN ACTIVITY LOG ───
export const adminActivityLog = mysqlTable("admin_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  adminName: varchar("adminName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
export type InsertAdminActivityLog = typeof adminActivityLog.$inferInsert;

// ─── REWARDS HISTORY ───
export const rewardsHistory = mysqlTable("rewards_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["earned", "redeemed", "bonus", "deducted"]).notNull(),
  points: int("points").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RewardsHistory = typeof rewardsHistory.$inferSelect;
export type InsertRewardsHistory = typeof rewardsHistory.$inferInsert;
