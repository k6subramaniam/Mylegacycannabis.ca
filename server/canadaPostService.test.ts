import { describe, expect, it } from "vitest";
import { getOriginPostal, validatePostalCode } from "./canadaPostService";

describe("Canada Post Service Utilities", () => {
  describe("getOriginPostal", () => {
    it("should return the default origin when no store name or ID is provided", () => {
      // Default fallback is L5B1H4 (Mississauga)
      expect(getOriginPostal()).toBe("L5B1H4");
    });

    it("should return the default origin when an unknown store name is provided", () => {
      expect(getOriginPostal("Unknown Store")).toBe("L5B1H4");
    });

    it("should return the correct postal code for known stores", () => {
      expect(getOriginPostal("mississauga")).toBe("L5B1H4");
      expect(getOriginPostal("hamilton")).toBe("L8N1A9");
    });

    it("should correctly handle store names with different casing and spaces", () => {
      expect(getOriginPostal("Hamilton Store")).toBe("L8N1A9");
      expect(getOriginPostal("Queen St")).toBe("M5V2A8");
      expect(getOriginPostal("Dundas Toronto")).toBe("M6J1V1");
    });
  });

  describe("validatePostalCode", () => {
    it("should return valid: true and formatted string for valid postal codes", () => {
      const result = validatePostalCode("M5V2A8");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("M5V 2A8");
    });

    it("should handle lowercase and spaces in postal codes", () => {
      const result = validatePostalCode("m5v 2a8");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("M5V 2A8");
    });

    it("should return valid: false for invalid postal codes", () => {
      expect(validatePostalCode("12345").valid).toBe(false);
      expect(validatePostalCode("ABC DEF").valid).toBe(false);
      expect(validatePostalCode("A1A1A").valid).toBe(false);
    });
  });
});
