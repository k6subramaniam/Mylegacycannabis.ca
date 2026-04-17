import { trpc } from "@/lib/trpc";
import { CANADA_PATHS } from "@/data/canada-map-paths";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Brain,
  RefreshCw,
  Users,
  Eye,
  Search,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Zap,
  Star,
  Package,
  Clock,
  DollarSign,
  Heart,
  Target,
  X,
  MapPin,
  Globe,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

// ─── Stealth: inject noindex meta on mount, remove on unmount ───
function useStealthMeta() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet";
    document.head.appendChild(meta);
    const origTitle = document.title;
    document.title = "Admin";
    return () => {
      document.head.removeChild(meta);
      document.title = origTitle;
    };
  }, []);
}

// ─── Mini bar ───
function MiniBar({
  value,
  max,
  color = "bg-[#4B2D8E]",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Sparkline ───
function Sparkline({
  data,
  color = "#4B2D8E",
}: {
  data: number[];
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 160,
    h = 40;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Area Chart (for daily trend) ───
function AreaChart({
  data,
  dataKey,
  color = "#4B2D8E",
  height = 120,
}: {
  data: Array<{ date: string; [key: string]: any }>;
  dataKey: string;
  color?: string;
  height?: number;
}) {
  if (!data.length) return null;
  const w = 600,
    h = height;
  const values = data.map(d => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (v / max) * (h - 10);
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${dataKey})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Event type friendly names ───
const EVENT_LABELS: Record<
  string,
  { label: string; icon: typeof Eye; color: string }
> = {
  page_view: { label: "Page Views", icon: Eye, color: "bg-blue-500" },
  product_view: {
    label: "Product Views",
    icon: Package,
    color: "bg-purple-500",
  },
  category_view: {
    label: "Category Views",
    icon: BarChart3,
    color: "bg-indigo-500",
  },
  add_to_cart: {
    label: "Add to Cart",
    icon: ShoppingCart,
    color: "bg-green-500",
  },
  remove_from_cart: {
    label: "Remove from Cart",
    icon: ShoppingCart,
    color: "bg-red-400",
  },
  search: { label: "Searches", icon: Search, color: "bg-orange-500" },
  click: { label: "Clicks", icon: Zap, color: "bg-yellow-500" },
  checkout_start: {
    label: "Checkout Start",
    icon: ShoppingCart,
    color: "bg-teal-500",
  },
  checkout_complete: {
    label: "Checkout Complete",
    icon: Star,
    color: "bg-emerald-500",
  },
  review_submit: { label: "Reviews Posted", icon: Heart, color: "bg-pink-500" },
};

// ─── Brand tokens for inline-styled geo components ───
const BRAND = {
  purple: "#4B2D8E",
  purpleLight: "#7c5cbf",
  orange: "#F15929",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  cyan: "#06b6d4",
  bg: "#f8f8f8",
  card: "#ffffff",
  text: "#1a1a2e",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

// ─── Canada SVG Map — real geographic province outlines from SVG path data ───
const PROVINCE_PATHS: Record<
  string,
  { name: string; abbr: string; path: string; labelX: number; labelY: number }
> = Object.fromEntries(
  Object.entries(CANADA_PATHS).map(([code, data]) => [
    code,
    {
      name: data.name,
      abbr: code,
      path: data.path,
      labelX: data.labelX,
      labelY: data.labelY,
    },
  ])
);

function getProvinceColor(
  value: number,
  maxValue: number,
  isSelected: boolean
): string {
  if (isSelected) return BRAND.orange;
  if (!value || value === 0) return "#e8e6f0";
  const intensity = Math.max(0.15, Math.min(1, value / maxValue));
  const r = Math.round(232 - intensity * (232 - 75));
  const g = Math.round(230 - intensity * (230 - 45));
  const b = Math.round(240 - intensity * (240 - 142));
  return `rgb(${r},${g},${b})`;
}

// ─── Category label + color mapping ───
const CATEGORY_COLORS: Record<string, string> = {
  flower: "#4B2D8E",
  "pre-rolls": "#22c55e",
  edibles: "#f59e0b",
  vapes: "#3b82f6",
  concentrates: "#ef4444",
  accessories: "#6b7280",
  "ounce-deals": "#8b5cf6",
  "shake-n-bake": "#ec4899",
};
function catLabel(cat: string): string {
  return cat
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── User Memory Card ───
function UserMemoryCard({
  memory,
  onViewDetail,
}: {
  memory: any;
  onViewDetail: () => void;
}) {
  const cats = (memory.preferredCategories || []).slice(0, 3);
  const strains = (memory.preferredStrains || []).slice(0, 3);
  const orders = memory.liveOrders ?? memory.totalOrders ?? 0;
  const spent = parseFloat(memory.liveSpent || memory.totalSpent || "0");
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={onViewDetail}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {memory.userName || `User #${memory.userId}`}
          </p>
          <p className="text-[10px] text-gray-400">{memory.userEmail || ""}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {orders > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              {orders} order{orders !== 1 ? "s" : ""}
            </span>
          )}
          {spent > 0 && (
            <span className="text-[10px] bg-[#4B2D8E]/10 text-[#4B2D8E] px-1.5 py-0.5 rounded-full font-medium">
              ${spent.toFixed(0)}
            </span>
          )}
        </div>
      </div>
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {cats.map((c: string) => (
            <span
              key={c}
              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {strains.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {strains.map((s: string) => (
            <span
              key={s}
              className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {memory.aiSummary && (
        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
          {memory.aiSummary}
        </p>
      )}
      <p className="text-[9px] text-gray-300 mt-2">
        Updated{" "}
        {memory.lastUpdated
          ? new Date(memory.lastUpdated).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "never"}
      </p>
    </div>
  );
}

// ─── Detail Modal ───
function MemoryDetailModal({
  memory,
  onClose,
}: {
  memory: any;
  onClose: () => void;
}) {
  const cats = memory.preferredCategories || [];
  const strains = memory.preferredStrains || [];
  const lastProducts = memory.lastProducts || [];
  const reviewHistory = memory.reviewHistory || [];
  const priceRange = memory.priceRange;

  const { data: liveStats, refetch: refetchOrderStats } =
    trpc.admin.aiMemory.getUserOrderStats.useQuery(
      { userId: memory.userId },
      { enabled: !!memory.userId, refetchInterval: 20_000, staleTime: 10_000 }
    );

  const totalOrders =
    liveStats?.totalOrders ?? memory.liveOrders ?? memory.totalOrders ?? 0;
  const totalSpent = parseFloat(
    liveStats?.totalSpent ?? memory.liveSpent ?? memory.totalSpent ?? "0"
  );
  const avgOrder = parseFloat(
    liveStats?.avgOrderValue ??
      memory.liveAvgOrder ??
      memory.avgOrderValue ??
      "0"
  );
  const orders = liveStats?.orders || [];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {memory.userName || `User #${memory.userId}`}
            </h3>
            <p className="text-xs text-gray-400">{memory.userEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live refresh indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1 text-[9px] text-green-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Auto-refreshing every 20s
          </span>
          <button
            onClick={() => refetchOrderStats()}
            className="text-[10px] text-gray-400 hover:text-[#4B2D8E] px-2 py-0.5 rounded hover:bg-gray-100 transition-all flex items-center gap-1"
          >
            <RefreshCw size={10} /> Refresh now
          </button>
        </div>

        {memory.aiSummary && (
          <div className="bg-gradient-to-r from-[#4B2D8E]/5 to-purple-50 rounded-xl p-4 mb-5 border border-[#4B2D8E]/10">
            <h4 className="text-xs font-semibold text-[#4B2D8E] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Brain size={13} /> AI Profile Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {memory.aiSummary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{totalOrders}</p>
            <p className="text-[10px] text-gray-400 uppercase">Orders</p>
            {liveStats && (
              <p className="text-[8px] text-green-500 mt-0.5">Live</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">
              ${totalSpent.toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Spent</p>
            {liveStats && (
              <p className="text-[8px] text-green-500 mt-0.5">Live</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">
              ${avgOrder.toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Avg Order</p>
            {liveStats && (
              <p className="text-[8px] text-green-500 mt-0.5">Live</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">
              {reviewHistory.length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Reviews</p>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package size={13} /> Order History
              <span className="text-[8px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full font-normal">
                Real-time
              </span>
            </h4>
            <div className="space-y-1">
              {orders.map((o: any) => {
                const statusColors: Record<string, string> = {
                  pending: "bg-yellow-100 text-yellow-700",
                  confirmed: "bg-blue-100 text-blue-700",
                  processing: "bg-indigo-100 text-indigo-700",
                  shipped: "bg-purple-100 text-purple-700",
                  delivered: "bg-green-100 text-green-700",
                  cancelled: "bg-red-100 text-red-700",
                  refunded: "bg-gray-100 text-gray-600",
                };
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-600">
                        {o.orderNumber}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">
                        ${parseFloat(o.total || "0").toFixed(2)}
                      </span>
                      <span className="text-gray-400">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("en-CA", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Preferred Categories
            </h4>
            {cats.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c: string) => (
                  <span
                    key={c}
                    className="text-xs bg-[#4B2D8E]/10 text-[#4B2D8E] px-2.5 py-1 rounded-lg font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No data yet</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Preferred Strains
            </h4>
            {strains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {strains.map((s: string) => (
                  <span
                    key={s}
                    className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No data yet</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Price Range
            </h4>
            {priceRange ? (
              <p className="text-sm font-medium text-gray-700">
                ${priceRange.min?.toFixed(2)} &ndash; $
                {priceRange.max?.toFixed(2)}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">No data yet</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Shopping Patterns
            </h4>
            {memory.shoppingPatterns ? (
              <p className="text-xs text-gray-600 leading-relaxed">
                {memory.shoppingPatterns}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">No data yet</p>
            )}
          </div>
        </div>

        {lastProducts.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Recently Viewed Products
            </h4>
            <div className="space-y-1">
              {lastProducts.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-gray-700 font-medium">
                    {p.name || p.slug}
                  </span>
                  <span className="text-gray-400">
                    {p.viewedAt
                      ? new Date(p.viewedAt).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewHistory.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Review History
            </h4>
            <div className="space-y-1">
              {reviewHistory.map((r: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-gray-700">Product #{r.productId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">
                      {"*".repeat(r.rating)}
                      {"*".repeat(5 - r.rating)}
                    </span>
                    <span className="text-gray-400">
                      {r.date
                        ? new Date(r.date).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-300 mt-4 text-right">
          Last updated:{" "}
          {memory.lastUpdated
            ? new Date(memory.lastUpdated).toLocaleString("en-CA")
            : "never"}
        </p>
      </div>
    </div>
  );
}

// ─── Canada Province Map (real SVG geographic shapes with heat-map fill) ───
function CanadaProvinceMap({
  data,
  selectedProvince,
  onSelectProvince,
  metric = "events",
}: {
  data: Array<{
    province: string;
    provinceCode: string;
    events: number;
    uniqueVisitors: number;
    orders: number;
    revenue: number;
  }>;
  selectedProvince: string | null;
  onSelectProvince: (code: string | null) => void;
  metric?: string;
}) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const dataMap = useMemo(() => {
    const map: Record<string, any> = {};
    (data || []).forEach(d => {
      map[d.provinceCode] = d;
    });
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(
      1,
      ...Object.values(dataMap).map((d: any) => d[metric] || d.events || 0)
    );
  }, [dataMap, metric]);

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox="-10 -10 813 1052"
        style={{ width: "100%", height: "auto", maxHeight: 420 }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Canada province map showing traffic distribution"
      >
        <rect
          x="-10"
          y="-10"
          width="813"
          height="1052"
          fill="#f0f4ff"
          rx="12"
        />
        {Object.entries(PROVINCE_PATHS).map(([code, prov]) => {
          const d = dataMap[code];
          const value = d ? d[metric] || d.events || 0 : 0;
          const isSelected = selectedProvince === code;
          const isHovered = hoveredProvince === code;
          return (
            <g key={code}>
              <path
                d={prov.path}
                fill={getProvinceColor(value, maxValue, isSelected)}
                stroke={
                  isSelected
                    ? BRAND.orange
                    : isHovered
                      ? BRAND.purple
                      : "#b8b0c8"
                }
                strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                strokeLinejoin="round"
                paintOrder="stroke fill"
                cursor={value > 0 ? "pointer" : "default"}
                onClick={() =>
                  value > 0 && onSelectProvince(isSelected ? null : code)
                }
                onMouseEnter={() => setHoveredProvince(code)}
                onMouseLeave={() => setHoveredProvince(null)}
                style={{
                  transition: "fill 0.3s, stroke-width 0.2s",
                  filter: isSelected
                    ? "drop-shadow(0 2px 6px rgba(241,89,41,0.3))"
                    : "none",
                }}
              />
              <text
                x={prov.labelX}
                y={prov.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize:
                    code === "PE" || code === "NB" || code === "NS" ? 14 : 18,
                  fontWeight: 700,
                  fill:
                    value > maxValue * 0.5
                      ? "#fff"
                      : isSelected
                        ? "#fff"
                        : "#4B2D8E",
                  pointerEvents: "none",
                  letterSpacing: 0.5,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {code}
              </text>
              {value > 0 && (
                <text
                  x={prov.labelX}
                  y={
                    prov.labelY +
                    (code === "PE" || code === "NB" || code === "NS" ? 14 : 20)
                  }
                  textAnchor="middle"
                  style={{
                    fontSize:
                      code === "PE" || code === "NB" || code === "NS" ? 11 : 13,
                    fontWeight: 600,
                    fill:
                      value > maxValue * 0.5
                        ? "rgba(255,255,255,0.85)"
                        : "#6b7280",
                    pointerEvents: "none",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {value.toLocaleString()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip card */}
      {hoveredProvince && dataMap[hoveredProvince] && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "white",
            borderRadius: 10,
            padding: "10px 14px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            border: `1px solid ${BRAND.border}`,
            minWidth: 160,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: BRAND.text,
              marginBottom: 6,
            }}
          >
            {PROVINCE_PATHS[hoveredProvince]?.name}
          </div>
          {(() => {
            const d = dataMap[hoveredProvince];
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 16px",
                  fontSize: 11,
                }}
              >
                <span style={{ color: BRAND.textMuted }}>Events</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>
                  {(d.events || 0).toLocaleString()}
                </span>
                <span style={{ color: BRAND.textMuted }}>Visitors</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>
                  {(d.uniqueVisitors || 0).toLocaleString()}
                </span>
                <span style={{ color: BRAND.textMuted }}>Orders</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>
                  {(d.orders || 0).toLocaleString()}
                </span>
                <span style={{ color: BRAND.textMuted }}>Revenue</span>
                <span
                  style={{
                    fontWeight: 600,
                    textAlign: "right",
                    color: BRAND.green,
                  }}
                >
                  ${(d.revenue || 0).toLocaleString()}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
          marginTop: 8,
          fontSize: 10,
          color: BRAND.textMuted,
        }}
      >
        <span>Less traffic</span>
        <div style={{ display: "flex", gap: 3 }}>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
            <div
              key={i}
              style={{
                width: 20,
                height: 12,
                borderRadius: 3,
                background: getProvinceColor(i * 100, 100, false),
              }}
            />
          ))}
        </div>
        <span>More traffic</span>
      </div>
    </div>
  );
}

// ─── Conversion Rate Table (sortable with Conv%, AOV, mini-bars) ───
function ConversionTable({
  data,
  provinceFilter,
}: {
  data: Array<{
    city: string;
    provinceCode: string;
    events: number;
    uniqueVisitors: number;
    orders: number;
    revenue: number;
  }>;
  provinceFilter: string | null;
}) {
  const [sortBy, setSortBy] = useState<string>("conversion");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const enriched = useMemo(() => {
    return (data || [])
      .filter(d => !provinceFilter || d.provinceCode === provinceFilter)
      .map(d => {
        const events = d.events || 0;
        const visitors = d.uniqueVisitors || 0;
        const orders = d.orders || 0;
        const revenue = d.revenue || 0;
        const conversion = visitors > 0 ? (orders / visitors) * 100 : 0;
        const aov = orders > 0 ? revenue / orders : 0;
        return { ...d, events, visitors, orders, revenue, conversion, aov };
      })
      .sort((a, b) => {
        const mult = sortDir === "desc" ? -1 : 1;
        return ((a as any)[sortBy] - (b as any)[sortBy]) * mult;
      });
  }, [data, provinceFilter, sortBy, sortDir]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 15) return BRAND.green;
    if (rate >= 10) return BRAND.yellow;
    if (rate >= 5) return BRAND.orange;
    return BRAND.red;
  };

  const SortHeader = ({
    col,
    label,
    align = "right",
  }: {
    col: string;
    label: string;
    align?: string;
  }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        padding: "8px 10px",
        textAlign: align as any,
        cursor: "pointer",
        userSelect: "none",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: "uppercase" as const,
        color: sortBy === col ? BRAND.purple : BRAND.textMuted,
        borderBottom: `2px solid ${sortBy === col ? BRAND.purple : BRAND.border}`,
        whiteSpace: "nowrap" as const,
      }}
    >
      {label} {sortBy === col ? (sortDir === "desc" ? "\u25BC" : "\u25B2") : ""}
    </th>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "8px 10px",
                textAlign: "left",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: BRAND.textMuted,
                borderBottom: `2px solid ${BRAND.border}`,
              }}
            >
              City
            </th>
            <SortHeader col="events" label="Events" />
            <SortHeader col="visitors" label="Visitors" />
            <SortHeader col="orders" label="Orders" />
            <SortHeader col="conversion" label="Conv %" />
            <SortHeader col="revenue" label="Revenue" />
            <SortHeader col="aov" label="AOV" />
          </tr>
        </thead>
        <tbody>
          {enriched.map((row, i) => (
            <tr
              key={row.city + row.provinceCode}
              style={{
                background: i % 2 === 0 ? "transparent" : "#f9fafb",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f3f0ff")}
              onMouseLeave={e =>
                (e.currentTarget.style.background =
                  i % 2 === 0 ? "transparent" : "#f9fafb")
              }
            >
              <td
                style={{
                  padding: "10px 10px",
                  fontWeight: 600,
                  color: BRAND.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{row.city}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: "#f3f0ff",
                      color: BRAND.purple,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    {row.provinceCode}
                  </span>
                </div>
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: BRAND.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.events.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: BRAND.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.visitors.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.orders.toLocaleString()}
              </td>
              <td style={{ padding: "10px", textAlign: "right" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 6,
                      background: "#e5e7eb",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, row.conversion * 3)}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: getConversionColor(row.conversion),
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: getConversionColor(row.conversion),
                    }}
                  >
                    {row.conversion.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: row.revenue > 0 ? BRAND.green : BRAND.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${row.revenue.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: row.aov > 0 ? BRAND.text : BRAND.textMuted,
                }}
              >
                ${row.aov.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {enriched.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: BRAND.textMuted,
            fontSize: 13,
          }}
        >
          No city data for selected period
        </div>
      )}
    </div>
  );
}

// ─── Conversion Funnel visualization ───
function ConversionFunnel({
  data,
}: {
  data: Array<{ events: number; uniqueVisitors: number; orders: number }>;
}) {
  const totals = useMemo(() => {
    if (!data?.length) return { visitors: 0, events: 0, orders: 0 };
    return data.reduce(
      (acc, d) => ({
        visitors: acc.visitors + (d.uniqueVisitors || 0),
        events: acc.events + (d.events || 0),
        orders: acc.orders + (d.orders || 0),
      }),
      { visitors: 0, events: 0, orders: 0 }
    );
  }, [data]);

  const steps = [
    { label: "Visitors", value: totals.visitors, color: BRAND.purple },
    { label: "Events", value: totals.events, color: BRAND.purpleLight },
    { label: "Orders", value: totals.orders, color: BRAND.green },
  ];

  const maxVal = Math.max(1, ...steps.map(s => s.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((step, i) => {
        const barWidth = Math.max(8, (step.value / maxVal) * 100);
        const dropoff = i > 0 ? (1 - step.value / steps[i - 1].value) * 100 : 0;
        return (
          <div key={step.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span
                style={{ fontSize: 11, fontWeight: 600, color: BRAND.text }}
              >
                {step.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: step.color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {step.value.toLocaleString()}
                </span>
                {i > 0 && dropoff > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: BRAND.red,
                      background: "#fef2f2",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    -
                    {dropoff >= 99.5 && dropoff < 100
                      ? dropoff.toFixed(1)
                      : dropoff.toFixed(0)}
                    %
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: 12,
                background: "#f3f4f6",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${barWidth}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: `linear-gradient(90deg, ${step.color}90, ${step.color})`,
                  transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminInsights() {
  useStealthMeta();

  const [detailMemory, setDetailMemory] = useState<any>(null);
  const [showEventBreakdown, setShowEventBreakdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"behavior" | "geo">("behavior");
  const [geoPeriod, setGeoPeriod] = useState(30);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [trendMetric, setTrendMetric] = useState<
    "events" | "visitors" | "orders"
  >("visitors");
  // citySortBy removed — ConversionTable handles its own sorting

  // ─── Existing data fetching ───
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = trpc.admin.aiMemory.aggregateAnalytics.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000, // Auto-refresh every 30s so new events appear promptly
    staleTime: 15_000, // Consider data fresh for 15s to avoid duplicate fetches
  });
  const {
    data: memories,
    isLoading: memoriesLoading,
    refetch: refetchMemories,
  } = trpc.admin.aiMemory.allMemories.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // ─── Geo data fetching ───
  const { data: geoProvinces, refetch: refetchGeoProvinces } =
    trpc.admin.geoAnalytics.byProvince.useQuery(
      { days: geoPeriod },
      {
        enabled: activeTab === "geo",
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
        staleTime: 15_000,
      }
    );
  const { data: geoCities, refetch: refetchGeoCities } =
    trpc.admin.geoAnalytics.byCity.useQuery(
      { days: geoPeriod, province: selectedProvince || undefined },
      {
        enabled: activeTab === "geo",
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
        staleTime: 15_000,
      }
    );
  const { data: geoProducts, refetch: refetchGeoProducts } =
    trpc.admin.geoAnalytics.productsByRegion.useQuery(
      { days: geoPeriod },
      {
        enabled: activeTab === "geo",
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
        staleTime: 15_000,
      }
    );
  const { data: proxyStats, refetch: refetchProxyStats } =
    trpc.admin.geoAnalytics.proxyStats.useQuery(
      { days: geoPeriod },
      {
        enabled: activeTab === "geo",
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
        staleTime: 15_000,
      }
    );
  const { data: dailyTrend, refetch: refetchDailyTrend } =
    trpc.admin.geoAnalytics.dailyTrend.useQuery(
      { days: geoPeriod },
      {
        enabled: activeTab === "geo",
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
        staleTime: 15_000,
      }
    );

  // Refetch ALL data (behavior + geo) — used by the Refresh button and auto-refresh
  const refetchAll = useCallback(() => {
    refetchMemories();
    refetchAnalytics();
    // Geo queries only have data if the tab has been visited at least once
    if (activeTab === "geo") {
      refetchGeoProvinces();
      refetchGeoCities();
      refetchGeoProducts();
      refetchProxyStats();
      refetchDailyTrend();
    }
  }, [
    activeTab,
    refetchMemories,
    refetchAnalytics,
    refetchGeoProvinces,
    refetchGeoCities,
    refetchGeoProducts,
    refetchProxyStats,
    refetchDailyTrend,
  ]);

  const refreshAllMut = trpc.admin.aiMemory.refreshAllMemories.useMutation({
    onSuccess: (res: any) => {
      if (res.refreshed > 0) {
        toast.success(
          `Updated ${res.refreshed} user profile${res.refreshed !== 1 ? "s" : ""} with new data`
        );
      } else {
        toast.info(
          "All profiles are already up to date — no new activity to process"
        );
      }
      refetchAll();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isLoading = analyticsLoading || memoriesLoading;
  const sortedMemories = [...(memories || [])].sort(
    (a: any, b: any) =>
      parseFloat(b.liveSpent || b.totalSpent || "0") -
      parseFloat(a.liveSpent || a.totalSpent || "0")
  );

  const totalEvents = analytics?.totalEvents ?? 0;
  const maxEventCount = Math.max(
    ...Object.values(analytics?.eventCounts ?? { _: 1 }),
    1
  );

  // ─── Geo computed: conversion metrics ───
  const geoConversionMetrics = useMemo(() => {
    if (!geoProvinces?.length)
      return {
        convRate: 0,
        aov: 0,
        bestCity: "-",
        bestCityConv: 0,
        topCity: "-",
        topCityEvents: 0,
        totalVisitors: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalEvents: 0,
      };
    const totalVisitors = geoProvinces.reduce(
      (s, p) => s + (p.uniqueVisitors || 0),
      0
    );
    const totalOrders = geoProvinces.reduce((s, p) => s + (p.orders || 0), 0);
    const totalRevenue = geoProvinces.reduce((s, p) => s + (p.revenue || 0), 0);
    const totalEvents = geoProvinces.reduce((s, p) => s + (p.events || 0), 0);
    const convRate =
      totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    // Best converting and highest traffic city
    let bestCity = "-",
      bestCityConv = 0,
      topCity = "-",
      topCityEvents = 0;
    if (geoCities?.length) {
      for (const c of geoCities) {
        const cv =
          c.uniqueVisitors > 0 ? (c.orders / c.uniqueVisitors) * 100 : 0;
        if (cv > bestCityConv) {
          bestCityConv = cv;
          bestCity = c.city;
        }
        if (c.events > topCityEvents) {
          topCityEvents = c.events;
          topCity = c.city;
        }
      }
    }
    return {
      convRate,
      aov,
      bestCity,
      bestCityConv,
      topCity,
      topCityEvents,
      totalVisitors,
      totalOrders,
      totalRevenue,
      totalEvents,
    };
  }, [geoProvinces, geoCities]);

  // Group products by province for category breakdown
  const productsByProvince = useMemo(() => {
    if (!geoProducts)
      return new Map<string, Array<{ category: string; orders: number }>>();
    const map = new Map<string, Array<{ category: string; orders: number }>>();
    for (const r of geoProducts) {
      if (!map.has(r.province)) map.set(r.province, []);
      map.get(r.province)!.push({ category: r.category, orders: r.orders });
    }
    return map;
  }, [geoProducts]);

  const trendColors = {
    events: "#4B2D8E",
    visitors: "#0ea5e9",
    orders: "#22c55e",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Brain size={24} className="text-[#4B2D8E]" />
            Customer Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered behavior analytics, user profiles, and geo-analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 bg-green-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live &middot; 30s
          </span>
          <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-1 rounded-full font-mono">
            {analytics?.activeUsers ?? 0} tracked users
          </span>
          <button
            onClick={() => refetchAll()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all"
            title="Refresh all dashboard data now"
          >
            <RefreshCw size={12} /> Data
          </button>
          <button
            onClick={() => refreshAllMut.mutate()}
            disabled={refreshAllMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50 transition-all"
          >
            <RefreshCw
              size={14}
              className={refreshAllMut.isPending ? "animate-spin" : ""}
            />
            {refreshAllMut.isPending ? "Refreshing..." : "Refresh Profiles"}
          </button>
        </div>
      </div>

      {/* ═══ Tab Switcher ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab("behavior")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "behavior"
              ? "bg-white text-[#4B2D8E] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Brain size={14} /> Behavior & AI
        </button>
        <button
          onClick={() => setActiveTab("geo")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "geo"
              ? "bg-white text-[#4B2D8E] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MapPin size={14} /> Geo-Analytics
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <RefreshCw size={28} className="animate-spin text-[#4B2D8E]" />
        </div>
      ) : activeTab === "behavior" ? (
        <>
          {/* ═══════════════════════════════════════════════════
              BEHAVIOR TAB (all existing content)
              ═══════════════════════════════════════════════════ */}

          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Events
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {totalEvents.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-white" />
                </div>
              </div>
              {analytics?.recentActivity &&
                analytics.recentActivity.length > 1 && (
                  <div className="mt-3">
                    <Sparkline
                      data={analytics.recentActivity.map(d => d.events)}
                      color="#4B2D8E"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Last 14 days
                    </p>
                  </div>
                )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {analytics?.activeUsers ?? 0}
                  </p>
                </div>
                <div className="bg-teal-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                With tracked behavior
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Profiles
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {sortedMemories.length}
                  </p>
                </div>
                <div className="bg-[#4B2D8E] w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Brain size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Personalization-ready
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Events / User
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {analytics?.avgEventsPerUser ?? 0}
                  </p>
                </div>
                <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Engagement depth</p>
            </div>
          </div>

          {/* Event Breakdown + Top Categories + Top Searches (3-col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <button
                className="w-full flex items-center justify-between mb-3"
                onClick={() => setShowEventBreakdown(!showEventBreakdown)}
              >
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-500" />
                  Event Breakdown
                </h3>
                {showEventBreakdown ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </button>
              {(showEventBreakdown ||
                Object.keys(analytics?.eventCounts ?? {}).length <= 6) && (
                <div className="space-y-2.5">
                  {Object.entries(analytics?.eventCounts ?? {}).map(
                    ([type, count]) => {
                      const meta = EVENT_LABELS[type] || {
                        label: type,
                        icon: Zap,
                        color: "bg-gray-400",
                      };
                      const Icon = meta.icon;
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center ${meta.color}`}
                              >
                                <Icon size={10} className="text-white" />
                              </span>
                              {meta.label}
                            </span>
                            <span className="font-mono text-gray-500">
                              {(count as number).toLocaleString()}
                            </span>
                          </div>
                          <MiniBar
                            value={count as number}
                            max={maxEventCount}
                            color={meta.color}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Target size={15} className="text-purple-500" />
                Top Browsed Categories
              </h3>
              {(analytics?.topCategories ?? []).length > 0 ? (
                <div className="space-y-2.5">
                  {analytics!.topCategories.map((c, i) => {
                    const maxViews = analytics!.topCategories[0]?.views || 1;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium flex items-center gap-1.5">
                            <span className="text-gray-400 font-mono w-4">
                              {i + 1}.
                            </span>
                            {c.category}
                          </span>
                          <span className="font-mono text-gray-500">
                            {c.views}
                          </span>
                        </div>
                        <MiniBar
                          value={c.views}
                          max={maxViews}
                          color="bg-[#4B2D8E]"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  No category browsing data yet
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Search size={15} className="text-orange-500" />
                Top Search Queries
              </h3>
              {(analytics?.topSearches ?? []).length > 0 ? (
                <div className="space-y-2">
                  {analytics!.topSearches.map((s, i) => (
                    <div
                      key={s.query}
                      className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-gray-700 flex items-center gap-1.5">
                        <span className="text-gray-400 font-mono w-4">
                          {i + 1}.
                        </span>
                        "{s.query}"
                      </span>
                      <span className="font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {s.count}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  No search data yet
                </p>
              )}
            </div>
          </div>

          {/* Top Viewed Products */}
          {(analytics?.topProducts ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Eye size={15} className="text-indigo-500" />
                Most Viewed Products
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {analytics!.topProducts.map((p, i) => {
                  const maxViews = analytics!.topProducts[0]?.views || 1;
                  return (
                    <div
                      key={p.slug}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5"
                    >
                      <span className="text-xs font-mono text-gray-400 w-5 shrink-0">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {p.slug.replace(/-/g, " ")}
                        </p>
                        <MiniBar
                          value={p.views}
                          max={maxViews}
                          color="bg-indigo-500"
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-500 shrink-0">
                        {p.views}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI User Profiles */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Brain size={18} className="text-[#4B2D8E]" />
                AI User Profiles
              </h3>
              <p className="text-xs text-gray-400">
                {sortedMemories.length} profile
                {sortedMemories.length !== 1 ? "s" : ""} &middot; sorted by
                total spent
              </p>
            </div>

            {sortedMemories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMemories.map((m: any) => (
                  <UserMemoryCard
                    key={m.userId}
                    memory={m}
                    onViewDetail={() => setDetailMemory(m)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Brain size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">
                  No AI profiles generated yet
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Profiles are auto-generated from user behavior every 30
                  minutes.
                  <br />
                  Click "Refresh All Profiles" to generate them now.
                </p>
              </div>
            )}
          </div>

          {/* Daily Activity Table */}
          {(analytics?.recentActivity ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Clock size={15} className="text-gray-500" />
                Daily Activity (Last 14 Days)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 uppercase tracking-wider">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-right py-2 px-3 font-medium">
                        Events
                      </th>
                      <th className="py-2 px-3 font-medium text-left w-2/3">
                        Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...analytics!.recentActivity].reverse().map(d => {
                      const maxDay = Math.max(
                        ...analytics!.recentActivity.map(a => a.events),
                        1
                      );
                      return (
                        <tr key={d.date} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-600 font-medium whitespace-nowrap">
                            {new Date(d.date + "T12:00:00").toLocaleDateString(
                              "en-CA",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">
                            {d.events}
                          </td>
                          <td className="py-2 px-3">
                            <MiniBar
                              value={d.events}
                              max={maxDay}
                              color="bg-[#4B2D8E]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════
              GEO-ANALYTICS TAB
              ═══════════════════════════════════════════════════ */}

          {/* Period selector */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-gray-500">Period:</span>
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setGeoPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  geoPeriod === d
                    ? "bg-[#4B2D8E] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Geo KPI cards — use CA-only geo data, not behavior-tab totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA Events
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {geoConversionMetrics.totalEvents.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Canada only</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA Cities
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {geoCities?.length ?? analytics?.uniqueCities ?? 0}
                  </p>
                </div>
                <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provinces
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {geoProvinces?.length ?? analytics?.activeProvinces ?? 0}
                  </p>
                </div>
                <div className="bg-[#4B2D8E] w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Globe size={18} className="text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proxy / VPN
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {proxyStats?.rate ?? analytics?.proxyRate ?? 0}%
                  </p>
                </div>
                <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {proxyStats?.proxy ?? 0} of {proxyStats?.total ?? 0} sessions
              </p>
            </div>
          </div>

          {/* Canada Province Map (full-width) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Globe size={15} className="text-[#4B2D8E]" />
                  Traffic by Province
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Click a province to filter &middot; Hover for details
                </p>
              </div>
              {selectedProvince && (
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="text-[11px] font-semibold text-[#F15929] bg-orange-50 border border-[#F15929]/20 px-3 py-1 rounded-lg hover:bg-orange-100 transition-all"
                >
                  Clear: {selectedProvince} &times;
                </button>
              )}
            </div>
            {(geoProvinces ?? []).length > 0 ? (
              <CanadaProvinceMap
                data={geoProvinces!}
                selectedProvince={selectedProvince}
                onSelectProvince={setSelectedProvince}
                metric="events"
              />
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Globe size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-xs text-gray-400">
                    No geo data yet. Events will appear as visitors browse.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Conversion Funnel + Key Metrics (2-col) */}
          {(geoProvinces ?? []).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-4">
                  <TrendingUp size={15} className="text-[#4B2D8E]" />
                  Conversion Funnel
                </h3>
                <ConversionFunnel data={geoProvinces!} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-4">
                  <Target size={15} className="text-[#4B2D8E]" />
                  Conversion Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Overall Conv. Rate",
                      value: `${geoConversionMetrics.convRate.toFixed(1)}%`,
                      sub: `${geoConversionMetrics.totalOrders} orders / ${geoConversionMetrics.totalVisitors} visitors`,
                      color:
                        geoConversionMetrics.convRate >= 15
                          ? BRAND.green
                          : geoConversionMetrics.convRate >= 5
                            ? BRAND.yellow
                            : BRAND.red,
                    },
                    {
                      label: "Avg Order Value",
                      value: `$${geoConversionMetrics.aov.toFixed(0)}`,
                      sub: "Across all orders",
                      color:
                        geoConversionMetrics.aov > 0
                          ? BRAND.green
                          : BRAND.textMuted,
                    },
                    {
                      label: "Best Converting City",
                      value: geoConversionMetrics.bestCity,
                      sub: `${geoConversionMetrics.bestCityConv.toFixed(1)}% conversion`,
                      color: BRAND.green,
                    },
                    {
                      label: "Highest Traffic",
                      value: geoConversionMetrics.topCity,
                      sub: `${geoConversionMetrics.topCityEvents.toLocaleString()} events`,
                      color: BRAND.purple,
                    },
                  ].map((card, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f9fafb",
                        borderRadius: 12,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                          color: BRAND.textMuted,
                          marginBottom: 6,
                        }}
                      >
                        {card.label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: card.color,
                        }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: BRAND.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {card.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* City Performance & Conversion Table (full-width) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <MapPin size={15} className="text-emerald-500" />
                City Performance &amp; Conversion
                {selectedProvince && (
                  <span className="text-[10px] bg-[#4B2D8E]/10 text-[#4B2D8E] px-2 py-0.5 rounded-full font-normal ml-1">
                    {selectedProvince}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Click column headers to sort &middot; Conv% = Orders &divide;
                Visitors &middot; AOV = Revenue &divide; Orders
              </p>
            </div>
            <ConversionTable
              data={geoCities || []}
              provinceFilter={selectedProvince}
            />
          </div>

          {/* Daily Trend Chart */}
          {(dailyTrend ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#4B2D8E]" />
                  Daily Trend
                </h3>
                <div className="flex gap-1">
                  {(["events", "visitors", "orders"] as const).map(key => (
                    <button
                      key={key}
                      onClick={() => setTrendMetric(key)}
                      className={`text-[10px] px-2.5 py-1 rounded transition-all ${
                        trendMetric === key
                          ? "bg-[#4B2D8E] text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart
                data={dailyTrend!}
                dataKey={trendMetric}
                color={trendColors[trendMetric]}
                height={140}
              />
              <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-1">
                <span>{dailyTrend![0]?.date}</span>
                <span>{dailyTrend![dailyTrend!.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Category Breakdown by Province */}
          {productsByProvince.size > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-4">
                <BarChart3 size={15} className="text-indigo-500" />
                Category Preferences by Province
              </h3>
              <div className="space-y-4">
                {Array.from(productsByProvince.entries())
                  .slice(0, 6)
                  .map(
                    ([province, cats]: [
                      string,
                      Array<{ category: string; orders: number }>,
                    ]) => {
                      const maxCat = Math.max(
                        ...cats.map(
                          (c: { category: string; orders: number }) => c.orders
                        ),
                        1
                      );
                      return (
                        <div key={province}>
                          <p className="text-xs font-semibold text-gray-700 mb-1.5">
                            {province}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {cats
                              .slice(0, 6)
                              .map(
                                (c: { category: string; orders: number }) => (
                                  <div
                                    key={c.category}
                                    className="flex items-center gap-1.5"
                                  >
                                    <div
                                      className="h-4 rounded"
                                      style={{
                                        width: `${Math.max(16, (c.orders / maxCat) * 120)}px`,
                                        backgroundColor:
                                          CATEGORY_COLORS[c.category] ||
                                          "#9ca3af",
                                        opacity: 0.8,
                                      }}
                                    />
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                      {catLabel(c.category)} ({c.orders})
                                    </span>
                                  </div>
                                )
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </div>
          )}

          {/* Province Revenue Breakdown */}
          {(geoProvinces ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <DollarSign size={15} className="text-green-500" />
                Revenue by Province
              </h3>
              <div className="space-y-2">
                {geoProvinces!
                  .filter(p => p.revenue > 0 || p.orders > 0)
                  .map(p => {
                    const maxRev = Math.max(
                      ...geoProvinces!.map(x => x.revenue),
                      1
                    );
                    return (
                      <div key={p.provinceCode}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium flex items-center gap-1.5">
                            <span className="text-[#4B2D8E] font-mono w-6">
                              {p.provinceCode}
                            </span>
                            {p.province}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400">
                              {p.orders} orders
                            </span>
                            <span className="font-mono text-gray-700 font-semibold">
                              ${p.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <MiniBar
                          value={p.revenue}
                          max={maxRev}
                          color="bg-emerald-500"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailMemory && (
        <MemoryDetailModal
          memory={detailMemory}
          onClose={() => setDetailMemory(null)}
        />
      )}
    </div>
  );
}
