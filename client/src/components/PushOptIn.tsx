/**
 * PushOptIn — non-intrusive push notification opt-in banner.
 *
 * Displays a dismissible bottom-right toast-style banner inviting the user to
 * enable push notifications. Shown once per session after the user has either:
 *   1. Completed ID verification, or
 *   2. Placed at least one order.
 *
 * If the user dismisses, we record it in localStorage so it only resurfaces
 * after 30 days.
 */

import { useState, useEffect } from "react";
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DISMISS_KEY = "mlc-push-dismiss";
const DISMISS_DAYS = 30;

export default function PushOptIn() {
  const { user, isAuthenticated } = useAuth();
  const { isSupported, isSubscribed, isDenied, loading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if: not authenticated, not supported, already subscribed, denied
    if (!isAuthenticated || !isSupported || isSubscribed || isDenied) return;

    // Only show for verified users or users with at least 1 order
    const qualified = user?.idVerified || (user?.orders && user.orders.length > 0);
    if (!qualified) return;

    // Check dismissal cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Show after a brief delay so page renders first
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isSupported, isSubscribed, isDenied, user]);

  if (!visible) return null;

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success("Notifications enabled! We'll keep you posted.", {
        icon: <Bell size={16} />,
      });
      setVisible(false);
    } else {
      toast.error("Could not enable notifications. Check browser permissions.");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-gradient-to-br from-[#4B2D8E] to-[#3a1f73] text-white rounded-2xl shadow-2xl p-5 border border-white/10">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 text-white/50 hover:text-white transition"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Stay in the loop</h4>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              Get notified about order updates, new drops, and exclusive rewards — right on your device.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#4B2D8E] font-semibold text-xs py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-60 transition"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bell size={14} />
            )}
            Enable Notifications
          </button>
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center gap-1 text-white/60 hover:text-white text-xs py-2.5 px-3 rounded-lg hover:bg-white/10 transition"
          >
            <BellOff size={12} />
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
