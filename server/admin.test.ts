import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext() {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-test",
    email: "admin@mylegacycannabis.ca",
    name: "Admin User",
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };

  return ctx;
}

function createUserContext() {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-test",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };

  return ctx;
}

describe("admin routes", () => {
  it("admin.stats returns dashboard stats for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalOrders");
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("pendingVerifications");
    expect(stats).toHaveProperty("totalProducts");
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("recentOrders");
    expect(typeof stats.totalOrders).toBe("number");
    expect(typeof stats.totalRevenue).toBe("number");
  });
});

it("admin.products.list returns products for admin users", async () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  const result = await caller.admin.products.list({ page: 1, limit: 10 });
  expect(result).toHaveProperty("data");
  expect(result).toHaveProperty("total");
  expect(Array.isArray(result.data)).toBe(true);
});

it("admin.orders.list returns orders for admin users", async () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  const result = await caller.admin.orders.list({ page: 1, limit: 10 });
  expect(result).toHaveProperty("data");
  expect(result).toHaveProperty("total");
  expect(Array.isArray(result.data)).toBe(true);
});

it("admin.verifications.list returns verifications for admin users", async () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  const result = await caller.admin.verifications.list({ page: 1, limit: 10 });
  expect(result).toHaveProperty("data");
  expect(result).toHaveProperty("total");
});

it("admin.shipping.list returns shipping zones for admin users", async () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  const zones = await caller.admin.shipping.list();
  expect(Array.isArray(zones)).toBe(true);
  if (zones.length > 0) {
    expect(zones[0]).toHaveProperty("zoneName");
    expect(zones[0]).toHaveProperty("rate");
    expect(zones[0]).toHaveProperty("provinces");
  }
});

it("admin.emailTemplates.list returns email templates for admin users", async () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  const templates = await caller.admin.emailTemplates.list();
  expect(Array.isArray(templates)).toBe(true);
  if (templates.length > 0) {
    expect(templates[0]).toHaveProperty("slug");
    expect(templates[0]).toHaveProperty("name");
    expect(templates[0]).toHaveProperty("subject");
  }
});

it("rejects non-admin users from admin routes", async () => {
  const ctx = createUserContext();
  const caller = appRouter.createCaller(ctx);
  await expect(caller.admin.stats()).rejects.toThrow();
});

describe("store routes", () => {
  it("store.products returns active products", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.products({ page: 1, limit: 10 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
  });

  it("store.shippingZones returns zones", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const zones = await caller.store.shippingZones();
    expect(Array.isArray(zones)).toBe(true);
  });
});
