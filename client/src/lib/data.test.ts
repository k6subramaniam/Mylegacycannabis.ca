import { describe, it, expect } from 'vitest';
import { calculatePointsEarned, getEligibleRewardTiers, rewardTiers, POINTS_PER_DOLLAR } from './data';

describe('Data Library', () => {
  describe('calculatePointsEarned', () => {
    it('should calculate points correctly for whole numbers', () => {
      expect(calculatePointsEarned(100)).toBe(100 * POINTS_PER_DOLLAR);
      expect(calculatePointsEarned(50)).toBe(50 * POINTS_PER_DOLLAR);
    });

    it('should floor the result for decimal subtotals', () => {
      expect(calculatePointsEarned(99.99)).toBe(Math.floor(99.99 * POINTS_PER_DOLLAR));
      expect(calculatePointsEarned(100.01)).toBe(Math.floor(100.01 * POINTS_PER_DOLLAR));
      expect(calculatePointsEarned(100.5)).toBe(Math.floor(100.5 * POINTS_PER_DOLLAR));
    });

    it('should return 0 for zero subtotal', () => {
      expect(calculatePointsEarned(0)).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(calculatePointsEarned(1000000)).toBe(1000000 * POINTS_PER_DOLLAR);
    });
  });

  describe('getEligibleRewardTiers', () => {
    it('should return no tiers if points are below the minimum threshold', () => {
      const minPoints = Math.min(...rewardTiers.map(t => t.pointsRequired));
      expect(getEligibleRewardTiers(minPoints - 1)).toEqual([]);
    });

    it('should return only the first tier when points exactly match its threshold', () => {
      const firstTier = rewardTiers[0];
      const eligible = getEligibleRewardTiers(firstTier.pointsRequired);
      expect(eligible).toHaveLength(1);
      expect(eligible[0].name).toBe(firstTier.name);
    });

    it('should return all tiers when points exceed the maximum threshold', () => {
      const maxPoints = Math.max(...rewardTiers.map(t => t.pointsRequired));
      const eligible = getEligibleRewardTiers(maxPoints + 100);
      expect(eligible).toHaveLength(rewardTiers.length);
    });

    it('should return correct tiers for intermediate point values', () => {
      // thresholds are 100, 250, 500, 1000, 2000
      expect(getEligibleRewardTiers(300)).toHaveLength(2); // Starter (100) and Silver (250)
      expect(getEligibleRewardTiers(750)).toHaveLength(3); // Starter, Silver, Gold (500)
    });

    it('should return all tiers when points exactly match the maximum threshold', () => {
      const maxPoints = Math.max(...rewardTiers.map(t => t.pointsRequired));
      const eligible = getEligibleRewardTiers(maxPoints);
      expect(eligible).toHaveLength(rewardTiers.length);
    });
  });
});
