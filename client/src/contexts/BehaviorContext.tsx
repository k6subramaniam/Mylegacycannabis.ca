/**
 * BehaviorContext — provides behavior tracking functions app-wide.
 * Wrap your app (or Layout) with <BehaviorProvider> and consume
 * with useBehavior() anywhere.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker';

type BehaviorTrackerAPI = ReturnType<typeof useBehaviorTracker>;

const BehaviorContext = createContext<BehaviorTrackerAPI | null>(null);

export function BehaviorProvider({ children }: { children: ReactNode }) {
  const tracker = useBehaviorTracker();
  return (
    <BehaviorContext.Provider value={tracker}>
      {children}
    </BehaviorContext.Provider>
  );
}

export function useBehavior(): BehaviorTrackerAPI {
  const ctx = useContext(BehaviorContext);
  if (!ctx) {
    // Return no-op functions if provider is not mounted (safety)
    return {
      trackPageView: () => {},
      trackProductView: () => {},
      trackCategoryView: () => {},
      trackAddToCart: () => {},
      trackRemoveFromCart: () => {},
      trackSearch: () => {},
      trackClick: () => {},
      trackCheckoutStart: () => {},
      trackCheckoutComplete: () => {},
    };
  }
  return ctx;
}
