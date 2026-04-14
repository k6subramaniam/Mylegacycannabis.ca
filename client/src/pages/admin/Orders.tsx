import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { ShoppingCart, Search, Eye, ArrowLeft, Truck, MessageSquare, DollarSign, Package, Clock, ShieldAlert, AlertCircle, CheckCircle2, Ban, Lock, Info, Zap, Timer, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// Helper: detect orders held pending ID verification
const isIdPending = (order: any) =>
  typeof order.notes === "string" && order.notes.includes("[ID VERIFICATION PENDING]");

/**
 * Canada Post tracking number validation.
 *
 * Accepted formats (per https://www.canadapost-postescanada.ca/cpc/en/support/kb/tracking/find-your-tracking-number.page):
 *  - 16 digits              e.g. 7023210039414604
 *  - 13 alphanumeric (S10)  2 letters + 9 digits + CA  e.g. EE123456789CA
 *  - 12 digits              shorter domestic PIN
 *  - 11 alphanumeric        2 letters + 7 digits + CA  e.g. AB1234567CA
 *
 * Input is normalised (spaces & dashes stripped, uppercased) before testing.
 */
function normalizeTrackingInput(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

interface TrackingValidation {
  valid: boolean;
  format: string | null;
  error: string | null;
}

function validateCanadaPostTracking(raw: string): TrackingValidation {
  const v = normalizeTrackingInput(raw);
  if (v.length === 0) return { valid: false, format: null, error: null }; // empty — no error yet

  // 16 digits — domestic PIN
  if (/^\d{16}$/.test(v)) return { valid: true, format: "Domestic PIN (16-digit)", error: null };

  // 13 alphanumeric — S10 international (2 letters + 9 digits + CA)
  if (/^[A-Z]{2}\d{9}CA$/.test(v)) return { valid: true, format: "International / Xpresspost (13-char)", error: null };

  // 12 digits — shorter domestic PIN
  if (/^\d{12}$/.test(v)) return { valid: true, format: "Domestic PIN (12-digit)", error: null };

  // 11 alphanumeric — 2 letters + 7 digits + CA
  if (/^[A-Z]{2}\d{7}CA$/.test(v)) return { valid: true, format: "Domestic (11-char)", error: null };

  // ── Helpful error messages for near-misses ──
  if (/^\d+$/.test(v)) {
    if (v.length < 12) return { valid: false, format: null, error: `Too short — Canada Post PINs are 12 or 16 digits (entered ${v.length})` };
    if (v.length > 16) return { valid: false, format: null, error: `Too long — Canada Post PINs are 12 or 16 digits (entered ${v.length})` };
    return { valid: false, format: null, error: `Invalid length — Canada Post PINs are 12 or 16 digits (entered ${v.length})` };
  }

  if (/^[A-Z]{2}.*CA$/.test(v)) {
    const mid = v.slice(2, -2);
    if (!/^\d+$/.test(mid)) return { valid: false, format: null, error: "Middle characters must be digits (e.g. AB123456789CA)" };
    if (mid.length !== 9 && mid.length !== 7) return { valid: false, format: null, error: `Alphanumeric tracking should be 11 or 13 chars ending in CA (entered ${v.length})` };
  }

  return { valid: false, format: null, error: "Not a valid Canada Post tracking number. Expected: 16 digits, 12 digits, or 2 letters + digits + CA (11 or 13 chars)." };
}

// Helper: format snake_case status to Title Case label
const formatStatus = (s: string) =>
  s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
// Statuses available in the manual dropdown — "shipped" is excluded because it's triggered by tracking entry
const MANUAL_STATUS_OPTIONS = ["pending", "confirmed", "processing", "delivered", "cancelled", "refunded"] as const;
const PAYMENT_OPTIONS = ["pending", "received", "confirmed", "partially_refunded", "refunded"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
  partially_refunded: "bg-orange-100 text-orange-700",
  received: "bg-blue-100 text-blue-700",
};

// ─── Canada Post Live Tracking Widget (fetches from /api/shipping/track/:pin) ───
function CanadaPostTrackingWidget({ pin }: { pin: string }) {
  const { data, isLoading, error } = trpc.store.trackShipment.useQuery({ pin }, {
    staleTime: 300_000, // cache 5 min
    retry: 1,
  });

  if (isLoading) return (
    <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );

  if (error || !data) return (
    <div className="text-[10px] text-gray-400 mt-1">
      Live tracking unavailable — <a
        href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${pin}`}
        target="_blank" rel="noopener noreferrer"
        className="text-[#4B2D8E] hover:underline"
      >track on Canada Post</a>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{data.status}</span>
        {data.expectedDelivery && (
          <span className="text-[10px] text-gray-500">
            Est. {new Date(data.expectedDelivery).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600">{data.lastEvent}</p>
      {data.events && data.events.length > 0 && (
        <div className="border-t border-gray-200 pt-2 mt-2 space-y-1.5">
          <p className="text-[10px] text-gray-400 font-medium">Recent Events</p>
          {data.events.slice(0, 3).map((evt: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-[#4B2D8E]' : 'bg-gray-300'}`} />
              <div>
                <span className="text-gray-500">{evt.date} {evt.time}</span>
                {evt.location && <span className="text-gray-400"> — {evt.location}</span>}
                <p className="text-gray-700">{evt.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const { data: order, isLoading } = trpc.admin.orders.get.useQuery({ id });
  const updateStatus = trpc.admin.orders.updateStatus.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); utils.admin.orders.list.invalidate(); utils.admin.stats.invalidate(); toast.success("Status updated"); } });
  const updatePayment = trpc.admin.orders.updatePayment.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); utils.admin.orders.list.invalidate(); utils.admin.stats.invalidate(); toast.success("Payment status updated"); } });
  const addTracking = trpc.admin.orders.addTracking.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); toast.success("Tracking added"); } });
  const addNote = trpc.admin.orders.addNote.useMutation({ onSuccess: () => { utils.admin.orders.get.invalidate({ id }); toast.success("Note added"); setNote(""); } });
  const [trackingNum, setTrackingNum] = useState("");
  const [trackingTouched, setTrackingTouched] = useState(false);
  const trackingValidation = useMemo(() => validateCanadaPostTracking(trackingNum), [trackingNum]);
  const [note, setNote] = useState("");

  if (isLoading) return <div className="p-6"><div className="animate-pulse h-8 bg-gray-200 rounded w-48" /></div>;
  if (!order) return <div className="p-6 text-center text-gray-500">Order not found</div>;

  const addr = order.shippingAddress as any;
  const paymentConfirmed = order.paymentStatus === 'confirmed' || order.paymentStatus === 'partially_refunded';
  const paymentGated = !paymentConfirmed;
  // Tracking can only be added when payment is confirmed AND order is in confirmed/processing
  const trackingBlocked = paymentGated || !['confirmed', 'processing'].includes(order.status);

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
            <p className="text-sm font-semibold text-orange-800">Held — Awaiting ID Verification</p>
            <p className="text-xs text-orange-700 mt-1">This order was placed by a guest whose ID is under review. Do not process or ship until identity is confirmed in <Link href="/admin/verifications" className="underline font-semibold">ID Verifications</Link>.</p>
          </div>
        </div>
      )}

      {/* Payment warning banner — shown when no payment is confirmed */}
      {order.paymentStatus === 'pending' && order.status !== 'cancelled' && order.status !== 'refunded' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">No Payment Matched</p>
            <p className="text-xs text-red-700 mt-1">No e-Transfer payment has been detected for this order. The order cannot advance until payment is received and confirmed. Check the <Link href="/admin/payments" className="underline font-semibold">Payments</Link> panel for unmatched transfers.</p>
          </div>
        </div>
      )}
      {order.paymentStatus === 'received' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Payment Received — Awaiting Confirmation</p>
            <p className="text-xs text-blue-700 mt-1">A payment has been matched to this order but has not been verified yet. Confirm the payment amount in the <Link href="/admin/payments" className="underline font-semibold">Payments</Link> panel to unlock order processing.</p>
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

          {/* Shipping Address & Method */}
          {addr && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck size={16} /> Shipping</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Delivery Address</p>
                  <p className="text-sm text-gray-700">{addr.street}<br />{addr.city}, {addr.province} {addr.postalCode}<br />{addr.country}</p>
                </div>
                <div className="space-y-2">
                  {(order as any).shippingMethodName && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Shipping Method</p>
                      <p className="text-sm text-gray-800 font-medium flex items-center gap-1.5">
                        {(order as any).shippingMethod === 'DOM.PC' ? <Timer size={14} className="text-[#F15929]" /> :
                         (order as any).shippingMethod === 'DOM.XP' ? <Zap size={14} className="text-[#4B2D8E]" /> :
                         (order as any).shippingMethod === 'DOM.EP' ? <Truck size={14} className="text-blue-500" /> :
                         <Package size={14} className="text-gray-500" />}
                        {(order as any).shippingMethodName}
                        {((order as any).shippingMethod === 'DOM.XP' || (order as any).shippingMethod === 'DOM.PC') && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Guaranteed</span>
                        )}
                      </p>
                    </div>
                  )}
                  {(order as any).estimatedDeliveryDate && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Est. Delivery</p>
                      <p className="text-sm text-gray-800">{new Date((order as any).estimatedDeliveryDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  )}
                  {(order as any).shippingOriginPostal && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Origin</p>
                      <p className="text-sm text-gray-600 font-mono">{(order as any).shippingOriginPostal}</p>
                    </div>
                  )}
                </div>
              </div>
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

          {/* Payment Section — linked payment record + confirm button */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><DollarSign size={16} /> Payment</h2>
            <div className="space-y-3">
              {/* Payment Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.paymentStatus]}`}>
                  {formatStatus(order.paymentStatus)}
                </span>
              </div>

              {/* Linked Payment Record (from e-transfer match) */}
              {(order as any).paymentRecord ? (() => {
                const pr = (order as any).paymentRecord;
                return (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Payment Matched</span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        pr.matchConfidence === 'exact' ? 'bg-green-100 text-green-700' :
                        pr.matchConfidence === 'high' ? 'bg-blue-100 text-blue-700' :
                        pr.matchConfidence === 'low' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {pr.matchConfidence} confidence
                      </span>
                    </div>
                    {pr.senderName && (
                      <div className="flex justify-between"><span className="text-gray-500">Sender</span><span className="font-medium">{pr.senderName}</span></div>
                    )}
                    {pr.senderEmail && (
                      <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-xs truncate max-w-[160px]">{pr.senderEmail}</span></div>
                    )}
                    {pr.amount && (
                      <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold">${Number(pr.amount).toFixed(2)}</span></div>
                    )}
                    {pr.memo && (
                      <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="text-xs truncate max-w-[160px]">{pr.memo}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="text-xs">{pr.matchMethod}</span></div>
                    {pr.receivedAt && (
                      <div className="flex justify-between"><span className="text-gray-500">Received</span><span className="text-xs">{new Date(pr.receivedAt).toLocaleString("en-CA")}</span></div>
                    )}
                    {/* Flag if sender name doesn't match customer */}
                    {pr.senderName && order.guestName && pr.senderName.toLowerCase() !== order.guestName.toLowerCase() && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2 flex items-start gap-1.5">
                        <ShieldAlert size={12} className="text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-700">Sender name does not match customer. Third-party payment?</p>
                      </div>
                    )}
                  </div>
                );
              })() : order.paymentStatus === 'pending' && order.status !== 'cancelled' && order.status !== 'refunded' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-800">No Payment Matched</p>
                    <p className="text-[10px] text-yellow-700 mt-0.5">No e-transfer has been linked yet. Check the <Link href="/admin/payments" className="underline font-semibold">Payments</Link> panel.</p>
                  </div>
                </div>
              ) : null}

              {/* Confirm Payment shortcut button */}
              {order.paymentStatus === 'received' && (
                <button
                  onClick={() => updatePayment.mutate({ id, paymentStatus: 'confirmed' })}
                  disabled={updatePayment.isPending}
                  className="w-full bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> Confirm Payment
                </button>
              )}

              {/* Manual payment status override */}
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Manual Override</label>
                <select value={order.paymentStatus} onChange={(e) => updatePayment.mutate({ id, paymentStatus: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                  {PAYMENT_OPTIONS.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock size={16} /> Order Status</h2>
            {/* Payment gate warning */}
            {paymentGated && order.status === 'pending' && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Payment must be <span className="font-semibold">Confirmed</span> before order can advance past Pending.</p>
              </div>
            )}
            <select
              value={order.status}
              onChange={(e) => updateStatus.mutate({ id, status: e.target.value as any })}
              disabled={paymentGated && !['cancelled', 'refunded', 'pending'].includes(order.status)}
              title={paymentGated ? "Payment must be confirmed before advancing the order" : undefined}
              className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white mb-3 ${paymentGated ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {/* Show current status even if it's "shipped" (read-only) */}
              {order.status === 'shipped' && <option value="shipped">Shipped</option>}
              {MANUAL_STATUS_OPTIONS.map(s => {
                // Disable forward statuses when payment is not confirmed
                const isForward = ['confirmed', 'processing', 'delivered'].includes(s);
                const disabled = paymentGated && isForward;
                return <option key={s} value={s} disabled={disabled}>{formatStatus(s)}{disabled ? ' (payment required)' : ''}</option>;
              })}
            </select>
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck size={16} /> Tracking</h2>
            {order.trackingNumber ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <a
                    href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${order.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-[#4B2D8E] font-semibold hover:text-[#F15929] hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    {order.trackingNumber}
                    <ExternalLink size={12} />
                  </a>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {order.status === 'delivered' ? 'Delivered' : 'In Transit'}
                  </span>
                </div>
                {/* Live tracking info from Canada Post API */}
                <CanadaPostTrackingWidget pin={order.trackingNumber} />
              </div>
            ) : trackingBlocked ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                <Lock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tracking unavailable</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {paymentGated
                      ? "Payment must be confirmed before tracking can be added."
                      : `Order must be in "confirmed" or "processing" state (current: ${order.status}).`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingNum}
                    onChange={(e) => { setTrackingNum(e.target.value); if (!trackingTouched) setTrackingTouched(true); }}
                    onBlur={() => setTrackingTouched(true)}
                    placeholder="e.g. 7023210039414604 or EE123456789CA"
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono tracking-wide ${
                      trackingTouched && trackingNum && !trackingValidation.valid
                        ? "border-red-400 focus:ring-red-200"
                        : trackingValidation.valid
                          ? "border-green-400 focus:ring-green-200"
                          : "border-gray-200"
                    } focus:outline-none focus:ring-2`}
                  />
                  <button
                    onClick={() => {
                      if (!trackingValidation.valid) {
                        toast.error(trackingValidation.error || "Invalid Canada Post tracking number");
                        return;
                      }
                      const normalized = normalizeTrackingInput(trackingNum);
                      addTracking.mutate({ id, trackingNumber: normalized });
                    }}
                    disabled={!trackingNum || !trackingValidation.valid || addTracking.isPending}
                    className="bg-[#F15929] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#d94d22] disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {/* Validation feedback */}
                {trackingTouched && trackingNum && (
                  trackingValidation.valid ? (
                    <p className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle2 size={13} /> {trackingValidation.format}
                    </p>
                  ) : trackingValidation.error ? (
                    <p className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle size={13} /> {trackingValidation.error}
                    </p>
                  ) : null
                )}
                <p className="text-[11px] text-gray-400">Canada Post: 16 digits, 12 digits, or 2 letters + digits + CA (11 or 13 chars)</p>
                <p className="text-[11px] text-blue-500 flex items-center gap-1 mt-1"><Info size={11} /> Adding tracking will auto-set the order to <span className="font-semibold">Shipped</span> and award reward points.</p>
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
  const { data, isLoading } = trpc.admin.orders.list.useQuery(
    { page, limit: 20, search: search || undefined, status: status || undefined },
    { refetchOnWindowFocus: true },
  );
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
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
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
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{formatStatus(order.status)}</span>
                    {isIdPending(order) && (
                      <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                        <ShieldAlert size={10} /> ID Review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.paymentStatus]}`}>{formatStatus(order.paymentStatus)}</span></td>
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
