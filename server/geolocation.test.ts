import { describe, it, expect } from "vitest";
import { isOptedOut } from "./geolocation";

describe("isOptedOut", () => {
  it("should return false if req has no headers", () => {
    expect(isOptedOut({})).toBe(false);
  });

  it("should return false if headers object is empty", () => {
    expect(isOptedOut({ headers: {} })).toBe(false);
  });

  it("should return true if DNT header is '1'", () => {
    expect(isOptedOut({ headers: { dnt: "1" } })).toBe(true);
  });

  it("should return false if DNT header is '0'", () => {
    expect(isOptedOut({ headers: { dnt: "0" } })).toBe(false);
  });

  it("should return true if sec-gpc header is '1'", () => {
    expect(isOptedOut({ headers: { "sec-gpc": "1" } })).toBe(true);
  });

  it("should return false if sec-gpc header is '0'", () => {
    expect(isOptedOut({ headers: { "sec-gpc": "0" } })).toBe(false);
  });

  it("should return true if mlc-analytics-optout cookie is set to '1'", () => {
    expect(
      isOptedOut({ headers: { cookie: "mlc-analytics-optout=1" } })
    ).toBe(true);
  });

  it("should return true if mlc-analytics-optout cookie is set to '1' among other cookies", () => {
    expect(
      isOptedOut({
        headers: { cookie: "session=123; mlc-analytics-optout=1; other=true" },
      })
    ).toBe(true);
  });

  it("should return false if mlc-analytics-optout cookie is set to '0' or missing", () => {
    expect(
      isOptedOut({ headers: { cookie: "session=123; mlc-analytics-optout=0" } })
    ).toBe(false);
    expect(isOptedOut({ headers: { cookie: "session=123" } })).toBe(false);
  });
});
