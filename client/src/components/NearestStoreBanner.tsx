import { useState, useEffect } from "react";
import { MapPin, X, Navigation } from "lucide-react";

interface NearestStoreData {
  store: {
    name: string;
    address: string;
    city: string;
    province: string;
    phone: string;
    hours: string;
    directionsUrl?: string;
  } | null;
  geo: { city: string; province: string; provinceCode: string } | null;
  source: string;
}

/**
 * NearestStoreBanner — shows the closest store based on the visitor's IP geolocation.
 * Respects opt-out cookie and dismissal. Only shows for Canadian visitors.
 */
export default function NearestStoreBanner() {
  const [data, setData] = useState<NearestStoreData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Skip if already dismissed this session or opted out
    if (sessionStorage.getItem("mlc-store-banner-dismissed")) return;
    if (document.cookie.includes("mlc-analytics-optout=1")) return;

    fetch("/api/geo/nearest-store", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: NearestStoreData | null) => {
        if (d?.store && d.geo?.provinceCode) {
          setData(d);
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  if (!data?.store || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("mlc-store-banner-dismissed", "1");
  };

  return (
    <div className="bg-gradient-to-r from-[#4B2D8E] to-[#3a2270] text-white px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="shrink-0 text-white/80" />
          <p className="text-xs sm:text-sm truncate">
            <span className="text-white/70">Near {data.geo!.city}?</span>{" "}
            <span className="font-semibold">{data.store.name}</span>{" "}
            <span className="text-white/70">—</span>{" "}
            <span className="text-white/80">{data.store.address}, {data.store.city}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.store.directionsUrl && (
            <a
              href={data.store.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] sm:text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-all"
            >
              <Navigation size={12} /> Directions
            </a>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 text-white/50 hover:text-white/90 transition-all"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
