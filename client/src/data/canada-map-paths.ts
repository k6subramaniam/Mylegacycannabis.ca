```react
import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

// Reliable, open-source GeoJSON for Canada's provinces
const CANADA_GEO_URL = 
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson";

// Define the expected structure for incoming real data
export interface ProvinceData {
  revenue: number;
  orders: number;
}

interface CanadaSalesMapProps {
  // Keyed by full province name (e.g., "Ontario", "British Columbia")
  salesData?: Record<string, ProvinceData>;
  isLoading?: boolean;
}

export default function CanadaSalesMap({ salesData = {}, isLoading = false }: CanadaSalesMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{
    name: string;
    revenue: number;
    orders: number;
  } | null>(null);
  
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Dynamically determine the color based on REAL data passed via props
  const getProvinceColor = (geoName: string) => {
    const data = salesData[geoName];
    
    // Default empty state (No data or zero revenue)
    if (!data || data.revenue === 0) return "#1F2937"; // Gray-800
    
    // Dynamic intensity based on revenue thresholds (Adjust these tiers based on your actual KPIs)
    if (data.revenue > 50000) return "#10B981"; // Bright Emerald (Top Performers)
    if (data.revenue > 10000) return "#059669"; // Mid Emerald
    return "#065F46"; // Dark Emerald (Low Performers)
  };

  return (
    <div className="relative w-full max-w-4xl p-6 bg-[#111111] rounded-2xl border border-gray-800 shadow-2xl">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white tracking-wide font-sans">
          Sales by Province
        </h2>
        {isLoading ? (
          <span className="text-sm font-medium text-gray-400 bg-gray-800 px-3 py-1 rounded-full animate-pulse">
            Syncing...
          </span>
        ) : (
          <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
            Live
          </span>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-xl overflow-hidden border border-gray-800">
        <ComposableMap
          projection="geoAzimuthalEqualArea"
          projectionConfig={{
            rotate: [100, -45, 0], // Centers Canada perfectly in the viewport
            scale: 800, // Adjusts zoom level
          }}
          className="w-full h-full"
        >
          <Geographies geography={CANADA_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const provinceName = geo.properties.name;
                const data = salesData[provinceName];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getProvinceColor(provinceName)}
                    stroke="#111111"
                    strokeWidth={1.5}
                    style={{
                      default: { outline: "none", transition: "all 250ms" },
                      hover: { 
                        fill: "#34D399", // Bright highlight on hover
                        outline: "none", 
                        cursor: "pointer",
                        transform: "translateY(-2px)",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      // Only show tooltip if data exists, otherwise default to 0
                      setTooltipContent({
                        name: provinceName,
                        revenue: data?.revenue || 0,
                        orders: data?.orders || 0,
                      });
                    }}
                    onMouseMove={(e) => {
                      // Offset tooltip slightly from cursor to prevent flickering
                      setTooltipPos({ x: e.clientX + 15, y: e.clientY - 30 });
                    }}
                    onMouseLeave={() => {
                      setTooltipContent(null);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Custom Floating Tooltip */}
      {tooltipContent && (
        <div
          className="fixed z-50 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="font-bold text-lg border-b border-gray-700 pb-1 mb-2">
            {tooltipContent.name}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Revenue:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ${tooltipContent.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Orders:</span>
              <span className="font-mono font-medium">
                {tooltipContent.orders.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

```
