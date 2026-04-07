/**
 * useBehaviorTracker — tracks user behavior for AI long-term memory.
 *
 * Records: page views, product views, category views, add-to-cart,
 * search queries, dwell time (time-on-page), clicks.
 *
 * Events are batched and flushed to the server every 10 seconds
 * or on page unload to minimize network requests.
 */

import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

type EventType =
  | 'page_view' | 'product_view' | 'category_view' | 'add_to_cart'
  | 'remove_from_cart' | 'search' | 'click' | 'checkout_start'
  | 'checkout_complete' | 'review_submit' | 'wishlist_add';

interface BehaviorEvent {
  sessionId: string;
  eventType: EventType;
  page?: string;
  productId?: number;
  productSlug?: string;
  category?: string;
  searchQuery?: string;
  metadata?: Record<string, any>;
  dwellTimeMs?: number;
}

// Generate or retrieve a persistent session ID
function getSessionId(): string {
  const key = 'mlc_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Singleton event buffer (shared across hook instances)
let eventBuffer: BehaviorEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushFn: ((events: BehaviorEvent[]) => void) | null = null;

const FLUSH_INTERVAL_MS = 10_000; // 10 seconds
const MAX_BUFFER_SIZE = 50;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, FLUSH_INTERVAL_MS);
}

function flushEvents() {
  if (eventBuffer.length === 0) return;
  const events = [...eventBuffer];
  eventBuffer = [];
  if (flushFn) flushFn(events);
}

/**
 * Hook that provides behavior tracking functions.
 * Should be used once at the app level (e.g., in Layout or App).
 */
export function useBehaviorTracker() {
  const sessionId = useRef(getSessionId());
  const pageEnteredAt = useRef<number>(Date.now());
  const currentPage = useRef<string>(window.location.pathname);
  const trackMutation = trpc.store.trackBehavior.useMutation();

  // Register the flush function
  useEffect(() => {
    flushFn = (events: BehaviorEvent[]) => {
      trackMutation.mutate({ events });
    };

    // Flush on page unload
    const handleUnload = () => {
      // Record dwell time for current page
      const dwellMs = Date.now() - pageEnteredAt.current;
      if (dwellMs > 1000) {  // only record if > 1 second
        eventBuffer.push({
          sessionId: sessionId.current,
          eventType: 'page_view',
          page: currentPage.current,
          dwellTimeMs: dwellMs,
          metadata: { type: 'dwell_close' },
        });
      }
      flushEvents();
    };

    window.addEventListener('beforeunload', handleUnload);
    // Also use visibilitychange for mobile
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handleUnload();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushEvents();
    };
  }, []);

  const pushEvent = useCallback((event: Omit<BehaviorEvent, 'sessionId'>) => {
    eventBuffer.push({ ...event, sessionId: sessionId.current });
    if (eventBuffer.length >= MAX_BUFFER_SIZE) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }, []);

  const trackPageView = useCallback((page: string) => {
    // Record dwell time for previous page (even if new page is admin)
    // — we must always reset the timer to prevent stale state
    const dwellMs = Date.now() - pageEnteredAt.current;
    const prevPage = currentPage.current;
    const isAdminPrev = prevPage.startsWith('/admin');

    // Emit dwell event for the PREVIOUS page only if it wasn't an admin page
    if (dwellMs > 1000 && prevPage !== page && !isAdminPrev) {
      pushEvent({
        eventType: 'page_view',
        page: prevPage,
        dwellTimeMs: dwellMs,
        metadata: { type: 'dwell_navigate' },
      });
    }

    // Always update state refs — keeps currentPage/pageEnteredAt fresh
    // regardless of whether the new page is admin or not
    pageEnteredAt.current = Date.now();
    currentPage.current = page;

    // Skip emitting page_view event for admin pages
    if (page.startsWith('/admin')) return;

    pushEvent({ eventType: 'page_view', page });
  }, [pushEvent]);

  const trackProductView = useCallback((productSlug: string, productId?: number, category?: string) => {
    pushEvent({ eventType: 'product_view', productSlug, productId, category, page: window.location.pathname });
  }, [pushEvent]);

  const trackCategoryView = useCallback((category: string) => {
    pushEvent({ eventType: 'category_view', category, page: window.location.pathname });
  }, [pushEvent]);

  const trackAddToCart = useCallback((productSlug: string, productId?: number, metadata?: Record<string, any>) => {
    pushEvent({ eventType: 'add_to_cart', productSlug, productId, page: window.location.pathname, metadata });
  }, [pushEvent]);

  const trackRemoveFromCart = useCallback((productSlug: string, productId?: number) => {
    pushEvent({ eventType: 'remove_from_cart', productSlug, productId, page: window.location.pathname });
  }, [pushEvent]);

  const trackSearch = useCallback((query: string) => {
    pushEvent({ eventType: 'search', searchQuery: query, page: window.location.pathname });
  }, [pushEvent]);

  const trackClick = useCallback((target: string, metadata?: Record<string, any>) => {
    pushEvent({ eventType: 'click', page: window.location.pathname, metadata: { target, ...metadata } });
  }, [pushEvent]);

  const trackCheckoutStart = useCallback(() => {
    pushEvent({ eventType: 'checkout_start', page: '/checkout' });
  }, [pushEvent]);

  const trackCheckoutComplete = useCallback((orderNumber: string, total: string) => {
    pushEvent({ eventType: 'checkout_complete', page: '/checkout', metadata: { orderNumber, total } });
  }, [pushEvent]);

  return {
    trackPageView,
    trackProductView,
    trackCategoryView,
    trackAddToCart,
    trackRemoveFromCart,
    trackSearch,
    trackClick,
    trackCheckoutStart,
    trackCheckoutComplete,
  };
}
