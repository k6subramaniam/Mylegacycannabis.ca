import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ShoppingCart, Search, Eye, ArrowLeft, Truck, MessageSquare, DollarSign, Package, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// Helper: detect orders held pending ID verification
const isIdPending = (order: any) =>
  typeof order.notes === "string" && order.notes.includes("[ID VERIFICATION PENDING]");

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const PAYMENT_OPTIONS = ["pending", "received", "confirmed", "refunded"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
  received: "bg-blue-100 text-blue-700",
};

function OrderDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const { data: order, isLoading } = trpc.admin.orders.get.useQuery({ id });
  const updateStatus = trpc.admin.orders.updateStatus.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); utils.admin.orders.list.invalidate(); utils.admin.stats.invalidate(); toast.success("Status updated"); } });
  const updatePayment = trpc.admin.orders.updatePayment.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); utils.admin.orders.list.invalidate(); utils.admin.stats.invalidate(); toast.success("Payment status updated"); } });
  const addTracking = trpc.admin.orders.addTracking.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); toast.success("Tracking added"); } });
  const addNote = trpc.admin.orders.addNote.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); toast.success("Note added"); setNote(""); } });
  const [trackingNum, setTrackingNum] = useState("");
  const [note, setNote] = useState("");

  if (isLoading) return <div className="p-6"><div className="animate-pulse h-8 bg-gray-200 rounded w-48" /></div>;
  if (!order) return <div className="p-6 text-center text-gray-500">Order not found</div>;

  const addr = order.shippingAddress as any;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString("en-CA")}</p>
        </div>
      </div>

      {/* ID Verification hold alert */}
      {isIdPending(order) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert size={20} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">⚠ Held — Awaiting ID Verification</p>
            <p className="text-xs text-orange-700 mt-1">This order was placed by a guest whose ID is under review. Do not process or ship until identity is confirmed in <Link href="/admin/verifications" className="underline font-semibold">ID Verifications</Link>.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Package size={16} /> Order Items</h2>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {item.productImage ? <img src={item.productImage} alt={item.productName} className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</p>
                  </div>
                  <p className="font-semibold text-sm">${(item.quantity * Number(item.price)).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping ({order.shippingZone || "—"})</span><span>${Number(order.shippingCost).toFixed(2)}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-${Number(order.discount).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Total</span><span>${Number(order.total).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Shipping Address */}
          {addr && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck size={16} /> Shipping Address</h2>
              <p className="text-sm text-gray-700">{addr.street}<br />{addr.city}, {addr.province} {addr.postalCode}<br />{addr.country}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare size={16} /> Admin Notes</h2>
            {order.adminNotes && <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mb-3 whitespace-pre-wrap font-sans">{order.adminNotes}</pre>}
            <div className="flex gap-2">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <button onClick={() => note && addNote.mutate({ id, note })} disabled={!note || addNote.isPending}
                className="bg-[#4B2D8E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Customer</h2>
            <p className="text-sm font-medium text-gray-800">{order.guestName || "—"}</p>
            <p className="text-sm text-gray-500">{order.guestEmail || "—"}</p>
            {order.guestPhone && <p className="text-sm text-gray-500">{order.guestPhone}</p>}
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock size={16} /> Order Status</h2>
            <select value={order.status} onChange={(e) => updateStatus.mutate({ id, status: e.target.value as any })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white mb-3">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><DollarSign size={16} /> Payment Status</h2>
            <select value={order.paymentStatus} onChange={(e) => updatePayment.mutate({ id, paymentStatus: e.target.value as any })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
              {PAYMENT_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck size={16} /> Tracking</h2>
            {order.trackingNumber ? (
              <div>
                <p className="text-sm font-mono text-[#4B2D8E] font-semibold">{order.trackingNumber}</p>
                {order.trackingUrl && <a href={order.trackingUrl as string} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F15929] hover:underline">Track Package</a>}
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)} placeholder="Tracking #"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                <button onClick={() => trackingNum && addTracking.mutate({ id, trackingNumber: trackingNum })} disabled={!trackingNum}
                  className="bg-[#F15929] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#d94d22] disabled:opacity-50">Add</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders({ routeId }: { routeId?: string }) {
  // routeId is passed directly from App.tsx route to avoid nested-router path mismatch
  if (routeId) return <OrderDetail id={parseInt(routeId)} />;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = trpc.admin.orders.list.useQuery({ page, limit: 20, search: search || undefined, status: status || undefined });
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} total orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by order #, name, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50"><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400"><ShoppingCart size={24} className="mx-auto mb-2 opacity-50" />No orders found</td></tr>
              ) : data?.data.map((order: any) => (
                <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isIdPending(order) ? "bg-yellow-50/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#4B2D8E]">{order.orderNumber}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-gray-800">{order.guestName || "—"}</p>
                    <p className="text-xs text-gray-400">{order.guestEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{order.status}</span>
                    {isIdPending(order) && (
                      <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                        <ShieldAlert size={10} /> ID Review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.paymentStatus]}`}>{order.paymentStatus}</span></td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">{new Date(order.createdAt).toLocaleDateString("en-CA")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="p-2 rounded-lg hover:bg-blue-50 text-[#4B2D8E] inline-block"><Eye size={16} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
