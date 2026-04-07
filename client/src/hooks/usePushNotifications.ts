/**
 * usePushNotifications — client-side push subscription hook.
 *
 * Manages service-worker registration, PushManager subscription state,
 * and TRPC calls to subscribe/unsubscribe on the server.
 *
 * Usage:
 *   const { isSupported, isSubscribed, subscribe, unsubscribe, loading } = usePushNotifications();
 */

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface PushState {
  /** Browser supports Push + Service Worker */
  isSupported: boolean;
  /** Current subscription is active on this device */
  isSubscribed: boolean;
  /** User dismissed the OS permission prompt ("denied") */
  isDenied: boolean;
  /** An async operation is in-flight */
  loading: boolean;
  /** Subscribe this browser to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe this browser */
  unsubscribe: () => Promise<void>;
}

/** Convert a VAPID base64url string to the Uint8Array PushManager expects */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications(): PushState {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch VAPID public key from server
  const { data: pushConfig } = trpc.store.pushConfig.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });

  const subscribeMut = trpc.store.pushSubscribe.useMutation();
  const unsubscribeMut = trpc.store.pushUnsubscribe.useMutation();

  // ─── Check current state on mount ───
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    if (Notification.permission === "denied") {
      setIsDenied(true);
    }

    // Check if there's already an active subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  // ─── Subscribe ───
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !pushConfig?.vapidPublicKey || !pushConfig?.enabled) return false;

    setLoading(true);
    try {
      // Register service worker (idempotent if already registered)
      const reg = await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsDenied(permission === "denied");
        return false;
      }

      // Subscribe with VAPID key
      const sub = await reg.pushManager.subscribe({
        userVisuallyIndicatesUserIsActive: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.vapidPublicKey),
      } as PushSubscriptionOptionsInit);

      const json = sub.toJSON();

      // Send to server
      await subscribeMut.mutateAsync({
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh || "",
          auth: json.keys?.auth || "",
        },
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.warn("[Push] Subscribe failed:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, pushConfig, subscribeMut]);

  // ─── Unsubscribe ───
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Remove from server first
        await unsubscribeMut.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.warn("[Push] Unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [isSupported, unsubscribeMut]);

  return { isSupported, isSubscribed, isDenied, loading, subscribe, unsubscribe };
}
