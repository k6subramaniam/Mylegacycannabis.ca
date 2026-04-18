import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock things before importing appRouter
vi.mock('../../db', () => ({
  getAllProducts: vi.fn(),
  getSiteConfig: vi.fn(),
  isIdVerificationEnabled: vi.fn().mockResolvedValue(false),
  getIdVerificationMode: vi.fn().mockResolvedValue('optional'),
  getMaintenanceConfig: vi.fn().mockResolvedValue({ enabled: false }),
  getBannerMessagesRaw: vi.fn().mockResolvedValue('[]'),
  getPaymentInstructions: vi.fn().mockResolvedValue([]),
  getStoreHoursConfig: vi.fn().mockResolvedValue({ isOpen: true }),
  getSiteSetting: vi.fn().mockResolvedValue('test'),
  getCartWarningsConfig: vi.fn().mockResolvedValue({ enabled: false }),
}));

// We need to mock @shared/const because it's aliased and might not resolve in vitest without proper configuration
vi.mock('@shared/const', () => ({
  STORE_NAME: 'Test Store'
}));

import { appRouter } from '../../routers';
import * as db from '../../db';

describe('Store Endpoints (tRPC)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.isIdVerificationEnabled).mockResolvedValue(false);
    vi.mocked(db.getIdVerificationMode).mockResolvedValue('optional');
    vi.mocked(db.getMaintenanceConfig).mockResolvedValue({ enabled: false } as any);
    vi.mocked(db.getBannerMessagesRaw).mockResolvedValue('[]' as any);
    vi.mocked(db.getPaymentInstructions).mockResolvedValue([]);
    vi.mocked(db.getStoreHoursConfig).mockResolvedValue({ isOpen: true } as any);
    vi.mocked(db.getSiteSetting).mockResolvedValue('test' as any);
    vi.mocked(db.getCartWarningsConfig).mockResolvedValue({ enabled: false } as any);
  });

  // Mock caller setup
  const caller = appRouter.createCaller({} as any);

  describe('store.products', () => {
    it('returns products with expected shape', async () => {
      vi.mocked(db.getAllProducts).mockResolvedValue({
        data: [{ id: 1, name: 'Product 1' } as any],
        total: 1
      });

      const result = await caller.store.products({ page: 1, limit: 10 });
      expect(result).toEqual({
        data: [{ id: 1, name: 'Product 1' }],
        total: 1
      });
      expect(db.getAllProducts).toHaveBeenCalledWith({
        activeOnly: true,
        limit: 10,
        page: 1,
        category: undefined,
        query: undefined,
        sort: undefined
      });
    });
  });

  describe('store.relatedProducts', () => {
    it('returns related products without the current product', async () => {
      // Mock returns 3 products
      vi.mocked(db.getAllProducts).mockResolvedValue({
        data: [
          { id: 1, name: 'P1' } as any,
          { id: 2, name: 'P2' } as any,
          { id: 3, name: 'P3' } as any
        ],
        total: 3
      });

      // Request related products for P1
      const result = await caller.store.relatedProducts({
        productId: 1,
        category: 'flower',
        limit: 2
      });

      // Should not contain P1
      expect(result.some((p: any) => p.id === 1)).toBe(false);
      // Should have at most the requested limit
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('store.siteConfig', () => {
    it('returns site config', async () => {
      vi.mocked(db.getSiteConfig).mockResolvedValue({
        id: 1,
        homeMetaTitle: 'Test Title'
      } as any);

      const result = await caller.store.siteConfig();
      expect(result).toEqual(expect.objectContaining({
        idVerificationEnabled: false,
        idVerificationMode: 'optional',
        maintenance: { enabled: false }
      }));
    });
  });
});
