import { useState, useMemo, useCallback } from "react";
import { CANADA_PATHS } from "@/data/canada-map-paths";
import {
  MapPin,
  TrendingUp,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ProvinceSalesData {
  revenue: number;
  orders: number;
  province: string; // Full name e.g. "Ontario"
}

export type SalesByProvinceMap = Record<string, ProvinceSalesData>;

interface Props {
  data: SalesByProvinceMap;
  loading?: boolean;
  onRequestInsight?: () => void;
  insight?: string | null;
  insightLoading?: boolean;
}

// ─── Color scale ────────────────────────────────────────────────────────────────

const COLOR_SCALE = [
  "#f3f0ff", // 0 – no data
  "#ddd6fe", // 1 – minimal
  "#c4b5fd", // 2
  "#a78bfa", // 3
  "#8b5cf6", // 4
  "#7c3aed", // 5
  "#6d28d9", // 6 – maximum
] as const;

function getColor(revenue: number, maxRevenue: number): string {
  if (!revenue || maxRevenue <= 0) return COLOR_SCALE[0];
  const ratio = revenue / maxRevenue;
  const idx = Math.min(
    Math.floor(ratio * (COLOR_SCALE.length - 1)) + 1,
    COLOR_SCALE.length - 1
  );
  return COLOR_SCALE[idx];
}

// ─── Revenue formatter ──────────────────────────────────────────────────────────

function fmtRevenue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function CanadaSalesDashboard({
  data,
  loading = false,
  onRequestInsight,
  insight,
  insightLoading = false,
}: Props) {
  const [tooltip, setTooltip] = useState<{
    code: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  // Derive max revenue for color scaling
  const maxRevenue = useMemo(() => {
    const values = Object.values(data).map(d => d.revenue);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  }, [data]);

  // Total stats
  const totals = useMemo(() => {
    const entries = Object.values(data);
    return {
      revenue: entries.reduce((s, d) => s + d.revenue, 0),
      orders: entries.reduce((s, d) => s + d.orders, 0),
      provinces: entries.filter(d => d.orders > 0).length,
    };
  }, [data]);

  // Province mouse handlers
  const handleMouseEnter = useCallback(
    (code: string, e: React.MouseEvent<SVGPathElement>) => {
      const rect = (e.target as SVGPathElement).getBoundingClientRect();
      const name = CANADA_PATHS[code]?.name ?? code;
      setTooltip({
        code,
        name,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // ─── Empty state ──────────────────────────────────────────────────────────────

  if (!loading && Object.keys(data).length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-[#4B2D8E]" /> Sales by Province
        </h2>
        <div className="text-center py-12">
          <MapPin size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No provincial sales data yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Data will appear once orders have shipping addresses
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <MapPin size={16} className="text-[#4B2D8E]" /> Sales by Province
        </h2>
        {onRequestInsight && (
          <button
            onClick={onRequestInsight}
            disabled={insightLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4B2D8E]/10 text-[#4B2D8E] hover:bg-[#4B2D8E]/20 transition-colors disabled:opacity-50"
          >
            {insightLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            AI Insight
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Revenue
          </p>
          <p className="text-lg font-bold text-green-700">
            {fmtRevenue(totals.revenue)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Orders
          </p>
          <p className="text-lg font-bold text-[#4B2D8E]">{totals.orders}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Provinces
          </p>
          <p className="text-lg font-bold text-blue-700">
            {totals.provinces}/13
          </p>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
            <Loader2 size={28} className="animate-spin text-[#4B2D8E]" />
          </div>
        )}

        <svg
          viewBox="0 0 800 1050"
          className="w-full h-auto"
          role="img"
          aria-label="Canada sales map by province and territory"
        >
          <title>Canada Sales Map</title>
          {Object.entries(CANADA_PATHS).map(([code, prov]) => {
            const provData = data[code];
            const fill = getColor(provData?.revenue ?? 0, maxRevenue);
            return (
              <g key={code}>
                <path
                  d={prov.path}
                  fill={fill}
                  stroke="#9ca3af"
                  strokeWidth="0.5"
                  className="transition-colors duration-200 cursor-pointer hover:brightness-90"
                  onMouseEnter={e => handleMouseEnter(code, e)}
                  onMouseLeave={handleMouseLeave}
                  role="listitem"
                  aria-label={`${prov.name}: ${fmtRevenue(provData?.revenue ?? 0)} revenue, ${provData?.orders ?? 0} orders`}
                />
                <text
                  x={prov.labelX}
                  y={prov.labelY}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  fill="#374151"
                  fontSize="9"
                  fontWeight="600"
                >
                  {code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-semibold">
              {tooltip.name} ({tooltip.code})
            </p>
            <p>Revenue: {fmtRevenue(data[tooltip.code]?.revenue ?? 0)}</p>
            <p>Orders: {data[tooltip.code]?.orders ?? 0}</p>
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-1 mt-3 mb-2">
        <span className="text-[10px] text-gray-400">$0</span>
        {COLOR_SCALE.map((c, i) => (
          <div
            key={i}
            className="w-6 h-2.5 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-[10px] text-gray-400">
          {fmtRevenue(maxRevenue)}
        </span>
      </div>

      {/* AI Insight panel */}
      {(insight || insightLoading) && (
        <div className="mt-4 bg-[#4B2D8E]/5 rounded-lg p-4 border border-[#4B2D8E]/10">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-[#4B2D8E] mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700 leading-relaxed">
              {insightLoading ? (
                <span className="text-gray-400 italic">
                  Generating insight...
                </span>
              ) : (
                insight
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top provinces table */}
      {totals.orders > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={12} /> Top Provinces
          </h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {Object.entries(data)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .slice(0, 8)
              .map(([code, d]) => (
                <div
                  key={code}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        backgroundColor: getColor(d.revenue, maxRevenue),
                      }}
                    />
                    <span className="text-gray-700 font-medium">
                      {CANADA_PATHS[code]?.name ?? code}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">{d.orders} orders</span>
                    <span className="font-semibold text-green-700">
                      {fmtRevenue(d.revenue)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
