import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reserveUniqueCentAmount,
  findOrderByCentAmount,
} from "../../centMatching";
import * as db from "../../db";

vi.mock("../../db", () => ({
  getReservedCentOffsets: vi.fn(),
  createCentReservation: vi.fn(),
  findCentReservationByAmount: vi.fn(),
  markCentReservationMatched: vi.fn(),
  expireOldCentReservations: vi.fn(),
}));

describe("Cent Matching Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("reserveUniqueCentAmount", () => {
    it("reserves 1 cent if none used", async () => {
      vi.mocked(db.getReservedCentOffsets).mockResolvedValue([]);

      const result = await reserveUniqueCentAmount(120.0, 1);

      expect(result).toBe(120.01);
      expect(db.createCentReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: "120.00",
          centOffset: 1,
          finalAmount: "120.01",
          orderId: 1,
        })
      );
    });

    it("reserves 2 cents if 1 is used", async () => {
      vi.mocked(db.getReservedCentOffsets).mockResolvedValue([1]);

      const result = await reserveUniqueCentAmount(120.0, 2);

      expect(result).toBe(120.02);
      expect(db.createCentReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: "120.00",
          centOffset: 2,
          finalAmount: "120.02",
          orderId: 2,
        })
      );
    });

    it("finds first available gap", async () => {
      vi.mocked(db.getReservedCentOffsets).mockResolvedValue([1, 2, 4]);

      const result = await reserveUniqueCentAmount(120.0, 3);

      expect(result).toBe(120.03);
      expect(db.createCentReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          centOffset: 3,
        })
      );
    });

    it("handles initial amounts that already have cents", async () => {
      vi.mocked(db.getReservedCentOffsets).mockResolvedValue([]);

      const result = await reserveUniqueCentAmount(120.5, 4);

      expect(result).toBe(120.51);
      expect(db.createCentReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: "120.00",
          centOffset: 1,
          finalAmount: "120.51",
        })
      );
    });

    it("rolls over to next dollar if 99 offsets are used", async () => {
      const usedOffsets = Array.from({ length: 99 }, (_, i) => i + 1);

      // First call (120.00) will see 99 used
      vi.mocked(db.getReservedCentOffsets).mockResolvedValueOnce(usedOffsets);
      // Second recursive call (121.00) will see 0 used
      vi.mocked(db.getReservedCentOffsets).mockResolvedValueOnce([]);

      const result = await reserveUniqueCentAmount(120.0, 5);

      expect(result).toBe(121.01);
      expect(db.getReservedCentOffsets).toHaveBeenCalledTimes(2);
      expect(db.createCentReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: "121.00",
          centOffset: 1,
          finalAmount: "121.01",
        })
      );
    });
  });

  describe("findOrderByCentAmount", () => {
    it("returns exact match if only 1 exists", async () => {
      vi.mocked(db.findCentReservationByAmount).mockResolvedValue([
        { id: 1, orderId: 10, finalAmount: "120.01" } as any,
      ]);

      const result = await findOrderByCentAmount(120.01);
      expect(result).toEqual({ orderId: 10, confidence: "exact" });
    });

    it("returns null if multiple matches", async () => {
      vi.mocked(db.findCentReservationByAmount).mockResolvedValue([
        { id: 1, orderId: 10, finalAmount: "120.01" } as any,
        { id: 2, orderId: 11, finalAmount: "120.01" } as any,
      ]);

      const result = await findOrderByCentAmount(120.01);
      expect(result).toBeNull();
    });

    it("returns null if no matches", async () => {
      vi.mocked(db.findCentReservationByAmount).mockResolvedValue([]);

      const result = await findOrderByCentAmount(120.01);
      expect(result).toBeNull();
    });
  });
});
