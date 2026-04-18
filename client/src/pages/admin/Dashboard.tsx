import { trpc } from "@/lib/trpc";
import {
  Package,
  ShoppingCart,
  ShieldCheck,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";
import { useSiteConfig } from "@/hooks/useSiteConfig";

export default function AdminDashboard() {
  const { idVerificationEnabled, maintenance } = useSiteConfig();
  const { data: stats, isLoading } = trpc.admin.stats.useQuery(undefined, {
    refetchInterval: 30_000, // re-poll every 30s so new orders/verifications appear without a refresh
    refetchOnWindowFocus: true,
    staleTime: 0, // always refetch when the query is invalidated or component mounts
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "bg-[#4B2D8E]",
      link: "/admin/orders",
    },
    {
      label: "Revenue",
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "bg-green-600",
      link: "/admin/reports",
    },
    // Only show Pending IDs card when verification is enabled
    ...(idVerificationEnabled
      ? [
          {
            label: "Pending IDs",
            value: stats?.pendingVerifications ?? 0,
            icon: ShieldCheck,
            color: stats?.pendingVerifications ? "bg-[#F15929]" : "bg-gray-400",
            link: "/admin/verifications",
          },
        ]
      : []),
    {
      label: "Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "bg-blue-600",
      link: "/admin/products",
    },
    {
      label: "Customers",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "bg-teal-600",
      link: "/admin/customers",
    },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    shipped: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back. Here's what's happening today.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-[#4B2D8E] hover:underline flex items-center gap-1"
        >
          View Store <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <Link
            key={card.label}
            href={card.link}
            className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`${card.color} w-8 h-8 rounded-lg flex items-center justify-center`}
              >
                <card.icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Alerts — only show pending IDs when verification is enabled */}
      {idVerificationEnabled && (stats?.pendingVerifications ?? 0) > 0 && (
        <div className="bg-[#F15929]/10 border border-[#F15929]/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-[#F15929] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#F15929]">
              {stats?.pendingVerifications} ID verification(s) awaiting review
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              New customers are waiting to be verified before they can place
              orders.
            </p>
          </div>
          <Link
            href="/admin/verifications"
            className="bg-[#F15929] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#d94d22] transition-colors shrink-0"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Maintenance mode alert */}
      {maintenance.enabled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Wrench size={20} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">
              Maintenance Mode is Active
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              The storefront is offline. Visitors see the maintenance page.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shrink-0"
          >
            Disable
          </Link>
        </div>
      )}

      {/* Notification when ID verification is disabled */}
      {!idVerificationEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldCheck size={20} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">
              ID Verification is currently disabled
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              All customers can place orders without ID checks.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-amber-700 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-300 hover:bg-amber-100 transition-colors shrink-0"
          >
            Settings
          </Link>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
          <h2 className="font-display text-lg text-gray-800">RECENT ORDERS</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-[#4B2D8E] hover:underline flex items-center gap-1"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="text-left px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                    Customer
                  </th>
                  <th className="text-left px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    Payment
                  </th>
                  <th className="text-right px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="text-right px-4 md:px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-4 md:px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.slice(0, 10).map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 md:px-5 py-3 font-mono text-xs font-semibold text-[#4B2D8E]">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-gray-600 hidden sm:table-cell">
                      {order.guestName || "—"}
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.paymentStatus] || "bg-gray-100 text-gray-600"}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 md:px-5 py-3 text-right font-semibold">
                      ${Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(order.createdAt).toLocaleDateString("en-CA")}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#4B2D8E] hover:text-[#F15929]"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-400">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
            <p>
              No orders yet. They'll appear here once customers start ordering.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Add Product",
            icon: Package,
            path: "/admin/products?action=new",
            color: "text-[#4B2D8E]",
          },
          {
            label: "Review IDs",
            icon: ShieldCheck,
            path: "/admin/verifications",
            color: "text-[#F15929]",
          },
          {
            label: "Shipping Rates",
            icon: TrendingUp,
            path: "/admin/shipping",
            color: "text-green-600",
          },
          {
            label: "Email Templates",
            icon: Clock,
            path: "/admin/emails",
            color: "text-blue-600",
          },
        ].map(action => (
          <Link
            key={action.label}
            href={action.path}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-3 group"
          >
            <action.icon size={20} className={action.color} />
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
