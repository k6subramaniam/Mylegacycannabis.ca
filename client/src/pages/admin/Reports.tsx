import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Users } from "lucide-react";

export default function AdminReports() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  const metrics = [
    { label: "Total Revenue", value: `$${(stats?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "bg-green-600" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: "bg-[#4B2D8E]" },
    { label: "Total Products", value: stats?.totalProducts ?? 0, icon: Package, color: "bg-blue-600" },
    { label: "Total Customers", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-teal-600" },
    { label: "Pending IDs", value: stats?.pendingVerifications ?? 0, icon: TrendingUp, color: "bg-[#F15929]" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Overview of your store performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{m.label}</span>
              <div className={`${m.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                <m.icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{isLoading ? "—" : m.value}</p>
          </div>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Order Status Breakdown</h2>
        {stats?.recentOrders ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((status) => {
              const count = stats.recentOrders.filter((o: any) => o.status === status).length;
              const colors: Record<string, string> = {
                pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
                confirmed: "bg-blue-100 text-blue-700 border-blue-200",
                processing: "bg-purple-100 text-purple-700 border-purple-200",
                shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
                delivered: "bg-green-100 text-green-700 border-green-200",
                cancelled: "bg-red-100 text-red-700 border-red-200",
              };
              return (
                <div key={status} className={`rounded-xl p-4 border ${colors[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  <p className="text-xs font-medium uppercase">{status}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-6">No data available yet</p>
        )}
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={18} /> Revenue Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs font-medium text-green-600 uppercase">Gross Revenue</p>
            <p className="text-2xl font-bold text-green-700 mt-1">${(stats?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-medium text-blue-600 uppercase">Avg Order Value</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              ${stats?.totalOrders && stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : "0.00"}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-xs font-medium text-purple-600 uppercase">Products Listed</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.totalProducts ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Placeholder for future charts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-600 mb-1">Detailed Charts Coming Soon</h3>
        <p className="text-sm text-gray-400">Revenue trends, top products, geographic distribution, and more analytics will be available as order data grows.</p>
      </div>
    </div>
  );
}
