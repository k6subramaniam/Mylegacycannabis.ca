import { expect, test } from "vitest";
import { appRouter } from "./routers";

test("store.relatedProducts works", async () => {
  const caller = appRouter.createCaller({} as any);

  const res = await caller.store.relatedProducts({
    productId: 1,
    category: "flower",
    limit: 4,
  });

  expect(Array.isArray(res)).toBe(true);
});

test("store.siteConfig works", async () => {
  const caller = appRouter.createCaller({} as any);

  const res = await caller.store.siteConfig();

  expect(res).toBeDefined();
  expect(res).toHaveProperty("idVerificationEnabled");
  expect(res).toHaveProperty("idVerificationMode");
  expect(res).toHaveProperty("logoUrl");
});

test("store.products works", async () => {
  const caller = appRouter.createCaller({} as any);

  const res = await caller.store.products({
    page: 1,
    limit: 10,
  });

  expect(res).toBeDefined();
  expect(res).toHaveProperty("data");
  expect(res).toHaveProperty("total");
  expect(Array.isArray(res.data)).toBe(true);
});
