/**
 * My Legacy Cannabis — Service Worker
 *
 * Handles push notifications and notification click routing.
 * Registered by the main app in client/src/main.tsx.
 *
 * NOTE: This file is served from /sw.js (the site root) so its scope covers
 * the entire origin. Vite does NOT process this file — it's static.
 */

// ─── Push Event ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "My Legacy Cannabis",
    body: "You have a new notification",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    tag: data.tag || "default",
    renotify: true,
    actions: data.actions || [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click ─────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab if one is open
        for (const client of windowClients) {
          if (
            new URL(client.url).origin === self.location.origin &&
            "focus" in client
          ) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow(targetUrl);
      })
  );
});

// ─── Install & Activate ─────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
