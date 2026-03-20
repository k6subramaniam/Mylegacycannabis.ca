import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Users,
  Star, ShieldCheck, ArrowUp, ArrowDown, Calendar,
} from "lucide-react";

// ─── Mini bar component (no external chart lib needed) ────────────────────────
function MiniBar({ value, max, color = "bg-[#4B2D8E]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Simple sparkline using SVG ───────────────────────────────────────────────
function Sparkline({ data, color = "#4B2D8E" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 120, h = 36;
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

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, sparkData, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; sparkData?: number[]; trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        {sparkData && sparkData.length > 1 ? (
          <Sparkline data={sparkData} color={color.includes("green") ? "#16a34a" : color.includes("orange") || color.includes("F15929") ? "#F15929" : "#4B2D8E"} />
        ) : <div />}
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery();
  const { data: orderStats, isLoading: orderStatsLoading } = trpc.admin.orderStats.useQuery({ days });
  const { data: topProducts, isLoading: topLoading } = trpc.admin.topProducts.useQuery({ limit: 10 });

  const isLoading = statsLoading || orderStatsLoading || topLoading;

  // Revenue trend data (last N days, from orderStats)
  const revenueTrend = (orderStats ?? []).map((d: any) => parseFloat(d.revenue));
  const orderTrend = (orderStats ?? []).map((d: any) => d.orderCount);
  const totalPeriodRevenue = revenueTrend.reduce((a, b) => a + b, 0);
  const totalPeriodOrders = orderTrend.reduce((a, b) => a + b, 0);

  // Order status breakdown (from all recent orders in stats)
  const allOrders: any[] = stats?.recentOrders ?? [];
  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  const statusConfig: Record<string, { label: string; color: string; bar: string }> = {
    pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-400" },
    confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-700",     bar: "bg-blue-500" },
    processing: { label: "Processing", color: "bg-purple-100 text-purple-700", bar: "bg-purple-500" },
    shipped:    { label: "Shipped",    color: "bg-indigo-100 text-indigo-700", bar: "bg-indigo-500" },
    delivered:  { label: "Delivered",  color: "bg-green-100 text-green-700",   bar: "bg-green-500" },
    cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-700",       bar: "bg-red-400" },
    refunded:   { label: "Refunded",   color: "bg-gray-100 text-gray-600",     bar: "bg-gray-400" },
  };

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);

  // Top products bar chart
  const maxSold = topProducts?.length ? Math.max(...topProducts.map((p: any) => p.totalSold), 1) : 1;

  // Daily revenue table — last 14 days worth of data
  const dailyData = (orderStats ?? []).slice(-14);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Store performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue" icon={DollarSign} color="bg-green-600"
          value={isLoading ? "—" : `$${(stats?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`}
          sub="All time (paid orders)"
          sparkData={revenueTrend}
        />
        <StatCard
          label={`Orders (${days}d)`} icon={ShoppingCart} color="bg-[#4B2D8E]"
          value={isLoading ? "—" : totalPeriodOrders}
          sub={`$${totalPeriodRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2 })} revenue`}
          sparkData={orderTrend}
        />
        <StatCard
          label="Active Products" icon={Package} color="bg-blue-600"
          value={isLoading ? "—" : stats?.totalProducts ?? 0}
          sub="Listed in store"
        />
        <StatCard
          label="Customers" icon={Users} color="bg-teal-600"
          value={isLoading ? "—" : stats?.totalUsers ?? 0}
          sub={`${stats?.pendingVerifications ?? 0} pending ID${(stats?.pendingVerifications ?? 0) !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Revenue Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Gross Revenue</p>
          <p className="text-3xl font-bold text-green-700">
            ${(stats?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">Confirmed payments only</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg Order Value</p>
          <p className="text-3xl font-bold text-[#4B2D8E]">
            ${stats?.totalOrders && stats.totalOrders > 0
              ? (stats.totalRevenue / stats.totalOrders).toLocaleString("en-CA", { minimumFractionDigits: 2 })
              : "0.00"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Over {stats?.totalOrders ?? 0} orders</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Period Revenue</p>
          <p className="text-3xl font-bold text-blue-700">
            ${totalPeriodRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalPeriodOrders} orders in last {days} days</p>
        </div>
      </div>

      {/* Order Status Breakdown + Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Order Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={16} /> Order Status Breakdown
          </h2>
          {Object.keys(statusConfig).map(status => {
            const count = statusCounts[status] || 0;
            const cfg = statusConfig[status];
            return (
              <div key={status} className="flex items-center gap-3 mb-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium w-24 text-center shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
                <div className="flex-1">
                  <MiniBar value={count} max={maxStatusCount} color={cfg.bar} />
                </div>
                <span className="text-sm font-bold text-gray-700 w-6 text-right shrink-0">{count}</span>
              </div>
            );
          })}
          {allOrders.length === 0 && (
            <p className="text-gray-400 text-center py-4 text-sm">No orders yet</p>
          )}
        </div>

        {/* Daily Trend Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Daily Order Trend ({days}d)
          </h2>
          {dailyData.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No orders in this period</p>
            </div>
          ) : (
            <>
              {/* Mini chart */}
              <div className="mb-4 flex items-end gap-1 h-16">
                {dailyData.map((d: any, i: number) => {
                  const maxRev = Math.max(...dailyData.map((x: any) => parseFloat(x.revenue)), 1);
                  const pct = (parseFloat(d.revenue) / maxRev) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className="w-full bg-[#4B2D8E]/80 rounded-t hover:bg-[#4B2D8E] transition-colors cursor-default"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${d.date}: ${d.orderCount} orders, $${parseFloat(d.revenue).toFixed(2)}`}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Last 7 rows as table */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {[...dailyData].reverse().map((d: any) => (
                  <div key={d.date} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 font-mono">{d.date}</span>
                    <span className="text-gray-700 font-medium">{d.orderCount} order{d.orderCount !== 1 ? "s" : ""}</span>
                    <span className="text-green-700 font-semibold">${parseFloat(d.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Star size={16} className="text-[#F15929]" /> Top Products by Units Sold
        </h2>
        {topLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !topProducts?.length ? (
          <div className="text-center py-8">
            <Package size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p: any, i: number) => (
              <div key={p.productName} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{p.productName}</span>
                    <div className="flex items-center gap-4 shrink-0 ml-2">
                      <span className="text-xs text-gray-500">{p.totalSold} sold</span>
                      <span className="text-xs font-semibold text-green-700">${parseFloat(p.totalRevenue).toFixed(2)}</span>
                    </div>
                  </div>
                  <MiniBar value={p.totalSold} max={maxSold} color={i === 0 ? "bg-[#F15929]" : i < 3 ? "bg-[#4B2D8E]" : "bg-gray-300"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customers + Verifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={16} /> Customer Snapshot
          </h2>
          <div className="space-y-3">
            {[
              { label: "Total Registered", value: stats?.totalUsers ?? 0, color: "bg-teal-500" },
              { label: "Pending ID Verification", value: stats?.pendingVerifications ?? 0, color: "bg-[#F15929]" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                  <span className="text-sm text-gray-700">{row.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} /> Payment Status
          </h2>
          <div className="space-y-3">
            {["pending", "received", "confirmed", "refunded"].map(ps => {
              const count = allOrders.filter((o: any) => o.paymentStatus === ps).length;
              const payColors: Record<string, string> = {
                pending: "bg-yellow-100 text-yellow-700",
                received: "bg-blue-100 text-blue-700",
                confirmed: "bg-green-100 text-green-700",
                refunded: "bg-gray-100 text-gray-600",
              };
              return (
                <div key={ps} className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${payColors[ps] || "bg-gray-100 text-gray-600"}`}>
                    {ps.charAt(0).toUpperCase() + ps.slice(1)}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coming soon note */}
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <BarChart3 size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-500">More analytics coming as data grows</p>
        <p className="text-xs text-gray-400 mt-1">Geographic distribution, customer lifetime value, repeat order rate, and coupon usage will appear here.</p>
      </div>
    </div>
  );
}
