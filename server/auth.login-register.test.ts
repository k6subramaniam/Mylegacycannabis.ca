import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.loginEmail and auth.register", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testName = "Test User";
  const testPhone = "(437) 555-0123";

  it("registers a new user with email, name, and phone", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.register({
      email: testEmail,
      name: testName,
      phone: testPhone,
      birthday: "1990-01-15",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe(testEmail);
    expect(result.user?.name).toBe(testName);
    expect(result.user?.phone).toBe(testPhone);
    expect(result.user?.birthday).toBe("1990-01-15");
    expect(result.user?.rewardsPoints).toBe(25); // Welcome bonus
    expect(result.user?.idVerified).toBe(false);
  });

  it("fails to register a user with an email that already exists", async () => {
    const duplicateEmail = `dup-${Date.now()}@example.com`;
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First registration
    const firstResult = await caller.auth.register({
      email: duplicateEmail,
      name: testName,
      phone: testPhone,
      birthday: "1990-01-15",
    });
    expect(firstResult.success).toBe(true);

    // Second registration with same email should fail
    const result = await caller.auth.register({
      email: duplicateEmail,
      name: "Another User",
      phone: "(437) 555-0124",
      birthday: "1995-05-20",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already registered");
  });

  it("logs in an existing user by email", async () => {
    const loginEmail = `login-${Date.now()}@example.com`;
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First, register a user
    const registerResult = await caller.auth.register({
      email: loginEmail,
      name: testName,
      phone: testPhone,
      birthday: "1990-01-15",
    });

    expect(registerResult.success).toBe(true);

    // Now login with the same email
    const loginResult = await caller.auth.loginEmail({
      email: loginEmail,
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.email).toBe(loginEmail);
    expect(loginResult.user?.name).toBe(testName);
    expect(loginResult.user?.phone).toBe(testPhone);
  });

  it("fails to login with a non-existent email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginEmail({
      email: `nonexistent-${Date.now()}@example.com`,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns user with correct reward points after registration", async () => {
    const uniqueEmail = `test-rewards-${Date.now()}@example.com`;
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.register({
      email: uniqueEmail,
      name: "Rewards Test User",
      phone: "(437) 555-9999",
      birthday: "1990-01-15",
    });

    expect(result.success).toBe(true);
    expect(result.user?.rewardsPoints).toBe(25); // Welcome bonus
  });
});
