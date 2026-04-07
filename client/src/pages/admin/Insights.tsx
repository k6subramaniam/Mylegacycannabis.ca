import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Brain, RefreshCw, Users, Eye, Search, ShoppingCart, TrendingUp,
  ChevronDown, ChevronUp, BarChart3, Activity, Zap, Star,
  Package, Clock, DollarSign, Heart, Target, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Stealth: inject noindex meta on mount, remove on unmount ───
function useStealthMeta() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet";
    document.head.appendChild(meta);
    // Also set a restrictive title that reveals nothing
    const origTitle = document.title;
    document.title = "Admin";
    return () => {
      document.head.removeChild(meta);
      document.title = origTitle;
    };
  }, []);
}

// ─── Mini bar ───
function MiniBar({ value, max, color = "bg-[#4B2D8E]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Sparkline ───
function Sparkline({ data, color = "#4B2D8E" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 160, h = 40;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Event type friendly names ───
const EVENT_LABELS: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  page_view:        { label: "Page Views",      icon: Eye,          color: "bg-blue-500" },
  product_view:     { label: "Product Views",   icon: Package,      color: "bg-purple-500" },
  category_view:    { label: "Category Views",  icon: BarChart3,    color: "bg-indigo-500" },
  add_to_cart:      { label: "Add to Cart",     icon: ShoppingCart,  color: "bg-green-500" },
  remove_from_cart: { label: "Remove from Cart", icon: ShoppingCart, color: "bg-red-400" },
  search:           { label: "Searches",        icon: Search,       color: "bg-orange-500" },
  click:            { label: "Clicks",          icon: Zap,          color: "bg-yellow-500" },
  checkout_start:   { label: "Checkout Start",  icon: ShoppingCart,  color: "bg-teal-500" },
  checkout_complete: { label: "Checkout Complete", icon: Star,      color: "bg-emerald-500" },
  review_submit:    { label: "Reviews Posted",  icon: Heart,        color: "bg-pink-500" },
};

// ─── User Memory Card ───
function UserMemoryCard({ memory, onViewDetail }: { memory: any; onViewDetail: () => void }) {
  const cats = (memory.preferredCategories || []).slice(0, 3);
  const strains = (memory.preferredStrains || []).slice(0, 3);
  // Use live order data when available, fall back to cached AI memory data
  const orders = memory.liveOrders ?? memory.totalOrders ?? 0;
  const spent = parseFloat(memory.liveSpent || memory.totalSpent || "0");
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer" onClick={onViewDetail}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{memory.userName || `User #${memory.userId}`}</p>
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
            <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}
      {strains.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {strains.map((s: string) => (
            <span key={s} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      )}
      {memory.aiSummary && (
        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{memory.aiSummary}</p>
      )}
      <p className="text-[9px] text-gray-300 mt-2">
        Updated {memory.lastUpdated ? new Date(memory.lastUpdated).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}
      </p>
    </div>
  );
}

// ─── Detail Modal ───
function MemoryDetailModal({ memory, onClose }: { memory: any; onClose: () => void }) {
  const cats = memory.preferredCategories || [];
  const strains = memory.preferredStrains || [];
  const lastProducts = memory.lastProducts || [];
  const reviewHistory = memory.reviewHistory || [];
  const priceRange = memory.priceRange;

  // Fetch live order stats for this user (real-time, not cached AI memory)
  const { data: liveStats } = trpc.admin.aiMemory.getUserOrderStats.useQuery(
    { userId: memory.userId },
    { enabled: !!memory.userId }
  );

  // Use live data when available, fall back to cached AI memory
  const totalOrders = liveStats?.totalOrders ?? memory.liveOrders ?? memory.totalOrders ?? 0;
  const totalSpent = parseFloat(liveStats?.totalSpent ?? memory.liveSpent ?? memory.totalSpent ?? "0");
  const avgOrder = parseFloat(liveStats?.avgOrderValue ?? memory.liveAvgOrder ?? memory.avgOrderValue ?? "0");
  const orders = liveStats?.orders || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{memory.userName || `User #${memory.userId}`}</h3>
            <p className="text-xs text-gray-400">{memory.userEmail}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* AI Summary */}
        {memory.aiSummary && (
          <div className="bg-gradient-to-r from-[#4B2D8E]/5 to-purple-50 rounded-xl p-4 mb-5 border border-[#4B2D8E]/10">
            <h4 className="text-xs font-semibold text-[#4B2D8E] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Brain size={13} /> AI Profile Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{memory.aiSummary}</p>
          </div>
        )}

        {/* Stats row — LIVE DATA */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{totalOrders}</p>
            <p className="text-[10px] text-gray-400 uppercase">Orders</p>
            {liveStats && <p className="text-[8px] text-green-500 mt-0.5">Live</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">${totalSpent.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400 uppercase">Spent</p>
            {liveStats && <p className="text-[8px] text-green-500 mt-0.5">Live</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">${avgOrder.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400 uppercase">Avg Order</p>
            {liveStats && <p className="text-[8px] text-green-500 mt-0.5">Live</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{reviewHistory.length}</p>
            <p className="text-[10px] text-gray-400 uppercase">Reviews</p>
          </div>
        </div>

        {/* Order History — LIVE */}
        {orders.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package size={13} /> Order History
              <span className="text-[8px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full font-normal">Real-time</span>
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
                  <div key={o.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-600">{o.orderNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-600"}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">${parseFloat(o.total || "0").toFixed(2)}</span>
                      <span className="text-gray-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {/* Preferred Categories */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Preferred Categories</h4>
            {cats.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c: string) => (
                  <span key={c} className="text-xs bg-[#4B2D8E]/10 text-[#4B2D8E] px-2.5 py-1 rounded-lg font-medium">{c}</span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
          </div>

          {/* Preferred Strains */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Preferred Strains</h4>
            {strains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {strains.map((s: string) => (
                  <span key={s} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium">{s}</span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
          </div>

          {/* Price Range */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Price Range</h4>
            {priceRange ? (
              <p className="text-sm font-medium text-gray-700">${priceRange.min?.toFixed(2)} &ndash; ${priceRange.max?.toFixed(2)}</p>
            ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
          </div>

          {/* Shopping Patterns */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Shopping Patterns</h4>
            {memory.shoppingPatterns ? (
              <p className="text-xs text-gray-600 leading-relaxed">{memory.shoppingPatterns}</p>
            ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
          </div>
        </div>

        {/* Recently Viewed Products */}
        {lastProducts.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Recently Viewed Products</h4>
            <div className="space-y-1">
              {lastProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-700 font-medium">{p.name || p.slug}</span>
                  <span className="text-gray-400">{p.viewedAt ? new Date(p.viewedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review History */}
        {reviewHistory.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Review History</h4>
            <div className="space-y-1">
              {reviewHistory.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-700">Product #{r.productId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="text-gray-400">{r.date ? new Date(r.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-300 mt-4 text-right">
          Last updated: {memory.lastUpdated ? new Date(memory.lastUpdated).toLocaleString("en-CA") : "never"}
        </p>
      </div>
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

  // Data fetching
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = trpc.admin.aiMemory.aggregateAnalytics.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const { data: memories, isLoading: memoriesLoading, refetch: refetchMemories } = trpc.admin.aiMemory.allMemories.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const refreshAllMut = trpc.admin.aiMemory.refreshAllMemories.useMutation({
    onSuccess: (res: any) => {
      if (res.refreshed > 0) {
        toast.success(`Updated ${res.refreshed} user profile${res.refreshed !== 1 ? 's' : ''} with new data`);
      } else {
        toast.info('All profiles are already up to date — no new activity to process');
      }
      refetchMemories();
      refetchAnalytics();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isLoading = analyticsLoading || memoriesLoading;
  const sortedMemories = [...(memories || [])].sort((a: any, b: any) =>
    parseFloat(b.liveSpent || b.totalSpent || "0") - parseFloat(a.liveSpent || a.totalSpent || "0")
  );

  const totalEvents = analytics?.totalEvents ?? 0;
  const maxEventCount = Math.max(...Object.values(analytics?.eventCounts ?? { _: 1 }), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Brain size={24} className="text-[#4B2D8E]" />
            Customer Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered behavior analytics and user profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-1 rounded-full font-mono">
            {analytics?.activeUsers ?? 0} tracked users
          </span>
          <button
            onClick={() => refreshAllMut.mutate()}
            disabled={refreshAllMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={refreshAllMut.isPending ? "animate-spin" : ""} />
            {refreshAllMut.isPending ? "Refreshing..." : "Refresh All Profiles"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <RefreshCw size={28} className="animate-spin text-[#4B2D8E]" />
        </div>
      ) : (
        <>
          {/* ═══ Overview Stats ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Events</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{totalEvents.toLocaleString()}</p>
                </div>
                <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-white" />
                </div>
              </div>
              {analytics?.recentActivity && analytics.recentActivity.length > 1 && (
                <div className="mt-3">
                  <Sparkline data={analytics.recentActivity.map(d => d.events)} color="#4B2D8E" />
                  <p className="text-[10px] text-gray-400 mt-1">Last 14 days</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{analytics?.activeUsers ?? 0}</p>
                </div>
                <div className="bg-teal-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">With tracked behavior</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI Profiles</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{sortedMemories.length}</p>
                </div>
                <div className="bg-[#4B2D8E] w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <Brain size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Personalization-ready</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Events / User</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{analytics?.avgEventsPerUser ?? 0}</p>
                </div>
                <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Engagement depth</p>
            </div>
          </div>

          {/* ═══ Event Breakdown + Top Categories + Top Searches (3-col) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Event Type Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <button
                className="w-full flex items-center justify-between mb-3"
                onClick={() => setShowEventBreakdown(!showEventBreakdown)}
              >
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-500" />
                  Event Breakdown
                </h3>
                {showEventBreakdown ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>
              {(showEventBreakdown || Object.keys(analytics?.eventCounts ?? {}).length <= 6) && (
                <div className="space-y-2.5">
                  {Object.entries(analytics?.eventCounts ?? {}).map(([type, count]) => {
                    const meta = EVENT_LABELS[type] || { label: type, icon: Zap, color: "bg-gray-400" };
                    const Icon = meta.icon;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 text-gray-600">
                            <span className={`w-5 h-5 rounded flex items-center justify-center ${meta.color}`}>
                              <Icon size={10} className="text-white" />
                            </span>
                            {meta.label}
                          </span>
                          <span className="font-mono text-gray-500">{(count as number).toLocaleString()}</span>
                        </div>
                        <MiniBar value={count as number} max={maxEventCount} color={meta.color} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Categories */}
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
                            <span className="text-gray-400 font-mono w-4">{i + 1}.</span>
                            {c.category}
                          </span>
                          <span className="font-mono text-gray-500">{c.views}</span>
                        </div>
                        <MiniBar value={c.views} max={maxViews} color="bg-[#4B2D8E]" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">No category browsing data yet</p>
              )}
            </div>

            {/* Top Searches */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
                <Search size={15} className="text-orange-500" />
                Top Search Queries
              </h3>
              {(analytics?.topSearches ?? []).length > 0 ? (
                <div className="space-y-2">
                  {analytics!.topSearches.map((s, i) => (
                    <div key={s.query} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        <span className="text-gray-400 font-mono w-4">{i + 1}.</span>
                        "{s.query}"
                      </span>
                      <span className="font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{s.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">No search data yet</p>
              )}
            </div>
          </div>

          {/* ═══ Top Viewed Products ═══ */}
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
                    <div key={p.slug} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                      <span className="text-xs font-mono text-gray-400 w-5 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{p.slug.replace(/-/g, " ")}</p>
                        <MiniBar value={p.views} max={maxViews} color="bg-indigo-500" />
                      </div>
                      <span className="text-xs font-mono text-gray-500 shrink-0">{p.views}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ AI User Profiles ═══ */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Brain size={18} className="text-[#4B2D8E]" />
                AI User Profiles
              </h3>
              <p className="text-xs text-gray-400">
                {sortedMemories.length} profile{sortedMemories.length !== 1 ? "s" : ""} &middot; sorted by total spent
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
                <p className="text-gray-500 font-medium">No AI profiles generated yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Profiles are auto-generated from user behavior every 30 minutes.
                  <br />Click "Refresh All Profiles" to generate them now.
                </p>
              </div>
            )}
          </div>

          {/* ═══ Daily Activity Table ═══ */}
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
                      <th className="text-right py-2 px-3 font-medium">Events</th>
                      <th className="py-2 px-3 font-medium text-left w-2/3">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...analytics!.recentActivity].reverse().map(d => {
                      const maxDay = Math.max(...analytics!.recentActivity.map(a => a.events), 1);
                      return (
                        <tr key={d.date} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-600 font-medium whitespace-nowrap">
                            {new Date(d.date + "T12:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{d.events}</td>
                          <td className="py-2 px-3"><MiniBar value={d.events} max={maxDay} color="bg-[#4B2D8E]" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailMemory && (
        <MemoryDetailModal memory={detailMemory} onClose={() => setDetailMemory(null)} />
      )}
    </div>
  );
}
