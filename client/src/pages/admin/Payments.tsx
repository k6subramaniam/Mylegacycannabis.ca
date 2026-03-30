import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  DollarSign, Search, RefreshCw, Check, X, Eye, AlertCircle,
  CheckCircle2, Clock, Ban, Link2, Zap, HelpCircle, Mail, Save, Edit3
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  auto_matched: "bg-green-100 text-green-800",
  manual_matched: "bg-blue-100 text-blue-800",
  unmatched: "bg-yellow-100 text-yellow-800",
  ignored: "bg-gray-100 text-gray-500",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  exact: "bg-green-100 text-green-700",
  high: "bg-blue-100 text-blue-700",
  low: "bg-yellow-100 text-yellow-700",
  none: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS: Record<string, any> = {
  auto_matched: CheckCircle2,
  manual_matched: Check,
  unmatched: Clock,
  ignored: Ban,
};

export default function AdminPayments() {
  const [tab, setTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [matchOrderId, setMatchOrderId] = useState<Record<number, string>>({});
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const statusFilter = tab === "all" ? undefined : tab;

  const { data, isLoading, refetch } = trpc.etransfer.list.useQuery(
    { page, limit: 25, status: statusFilter },
    { refetchInterval: 30000 }
  );

  const { data: serviceStatus, refetch: refetchStatus } = trpc.etransfer.status.useQuery(undefined, {
    onSuccess: (d: any) => { if (!emailInput) setEmailInput(d.paymentEmail || ""); },
  });
  const { data: pendingOrders } = trpc.etransfer.pendingOrders.useQuery();

  const updateEmailMutation = trpc.etransfer.updatePaymentEmail.useMutation({
    onSuccess: (res: any) => {
      toast.success(`Payment email updated to ${res.email}`);
      setEditingEmail(false);
      refetchStatus();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pollMutation = trpc.etransfer.poll.useMutation({
    onSuccess: (stats) => {
      toast.success(`Poll complete: ${stats.processed} processed, ${stats.matched} matched`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const matchMutation = trpc.etransfer.manualMatch.useMutation({
    onSuccess: () => {
      toast.success("Payment matched to order!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const ignoreMutation = trpc.etransfer.ignore.useMutation({
    onSuccess: () => {
      toast.success("Payment ignored");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const payments = data?.data || [];
  const total = data?.total || 0;

  const tabs = [
    { key: "all", label: "All Payments" },
    { key: "unmatched", label: "Needs Review" },
    { key: "auto_matched", label: "Auto-Matched" },
    { key: "manual_matched", label: "Manual" },
    { key: "ignored", label: "Ignored" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign size={24} className="text-[#4B2D8E]" />
            E-Transfer Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-match Interac e-Transfer deposits to orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Service Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            serviceStatus?.configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            <div className={`w-2 h-2 rounded-full ${serviceStatus?.configured ? "bg-green-500" : "bg-red-500"}`} />
            {serviceStatus?.configured ? "Gmail Connected" : "Gmail Not Configured"}
          </div>

          {/* Poll Button */}
          <button
            onClick={() => pollMutation.mutate()}
            disabled={pollMutation.isPending || !serviceStatus?.configured}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={pollMutation.isPending ? "animate-spin" : ""} />
            {pollMutation.isPending ? "Polling..." : "Check Now"}
          </button>
        </div>
      </div>

      {/* Payment Email Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center">
              <Mail size={18} className="text-[#4B2D8E]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Customer-Facing Payment Email</h3>
              <p className="text-xs text-gray-400">This is shown on Checkout, FAQ, and order confirmations</p>
            </div>
          </div>
          {!editingEmail ? (
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-mono text-[#4B2D8E]">
                {serviceStatus?.paymentEmail || "payments@mylegacycannabis.ca"}
              </code>
              <button
                onClick={() => { setEmailInput(serviceStatus?.paymentEmail || ""); setEditingEmail(true); }}
                className="p-2 text-gray-400 hover:text-[#4B2D8E] rounded-lg hover:bg-gray-100 transition-colors"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="e.g. kumar.subramaniam@hotmail.com"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono w-72 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none"
              />
              <button
                onClick={() => { if (emailInput.includes("@")) updateEmailMutation.mutate({ email: emailInput.trim() }); }}
                disabled={updateEmailMutation.isPending || !emailInput.includes("@")}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-all"
              >
                <Save size={12} /> Save
              </button>
              <button
                onClick={() => setEditingEmail(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gmail Setup Info (only if not configured) */}
      {!serviceStatus?.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Gmail API Not Configured</p>
              <p className="text-xs text-amber-600 mt-1">
                Set these environment variables in Railway to enable auto-matching:<br />
                <code className="bg-amber-100 px-1 rounded">GMAIL_CLIENT_ID</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_CLIENT_SECRET</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_REFRESH_TOKEN</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_PAYMENT_EMAIL</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white text-[#4B2D8E] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-[#4B2D8E]" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && payments.length === 0 && (
        <div className="text-center py-20">
          <Mail size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No payment records found</p>
          <p className="text-sm text-gray-400 mt-1">
            {serviceStatus?.configured
              ? "e-Transfer notifications will appear here when received"
              : "Configure Gmail API to start auto-matching payments"}
          </p>
        </div>
      )}

      {/* Payment Records Table */}
      {!isLoading && payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matched Order</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p: any) => {
                const StatusIcon = STATUS_ICONS[p.status] || HelpCircle;
                const isExpanded = expandedId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.receivedAt ? new Date(p.receivedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{p.senderName || "Unknown"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.senderEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-800">
                        {p.amount ? `$${parseFloat(p.amount).toFixed(2)}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 truncate max-w-[200px]" title={p.memo || ""}>
                        {p.memo || <span className="text-gray-400 italic">No memo</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {p.matchedOrderNumber ? (
                        <Link href={`/admin/orders/${p.matchedOrderId}`} className="text-sm font-mono text-[#4B2D8E] hover:underline">
                          {p.matchedOrderNumber}
                        </Link>
                      ) : p.status === "unmatched" ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={matchOrderId[p.id] || ""}
                            onChange={e => setMatchOrderId({ ...matchOrderId, [p.id]: e.target.value })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[180px]"
                          >
                            <option value="">Select order…</option>
                            {(pendingOrders || []).map((o: any) => (
                              <option key={o.id} value={o.id}>
                                {o.orderNumber} — ${parseFloat(o.total).toFixed(2)} ({o.guestName || o.guestEmail})
                              </option>
                            ))}
                          </select>
                          {matchOrderId[p.id] && (
                            <button
                              onClick={() => matchMutation.mutate({ paymentId: p.id, orderId: parseInt(matchOrderId[p.id]) })}
                              disabled={matchMutation.isPending}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                              title="Match"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[p.matchConfidence] || CONFIDENCE_COLORS.none}`}>
                        {p.matchConfidence || "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.unmatched}`}>
                        <StatusIcon size={12} />
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="p-1.5 text-gray-400 hover:text-[#4B2D8E] rounded-lg hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {p.status === "unmatched" && (
                          <button
                            onClick={() => ignoreMutation.mutate({ paymentId: p.id })}
                            disabled={ignoreMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Ignore"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 25 >= total}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Details Modal */}
      {expandedId && payments.find((p: any) => p.id === expandedId) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setExpandedId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            {(() => {
              const p = payments.find((p: any) => p.id === expandedId)!;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Payment Details #{p.id}</h3>
                    <button onClick={() => setExpandedId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-gray-400">Sender</span><p className="font-medium">{p.senderName || "Unknown"}</p></div>
                      <div><span className="text-gray-400">Amount</span><p className="font-medium">{p.amount ? `$${parseFloat(p.amount).toFixed(2)}` : "—"}</p></div>
                      <div><span className="text-gray-400">Date</span><p className="font-medium">{p.receivedAt ? new Date(p.receivedAt).toLocaleString("en-CA") : "—"}</p></div>
                      <div><span className="text-gray-400">Match Method</span><p className="font-medium">{p.matchMethod || "—"}</p></div>
                    </div>
                    <div><span className="text-gray-400">Subject</span><p className="font-medium break-words">{p.rawSubject || "—"}</p></div>
                    <div><span className="text-gray-400">Memo</span><p className="font-medium break-words">{p.memo || "No memo"}</p></div>
                    <div><span className="text-gray-400">Email Snippet</span><p className="text-xs text-gray-500 break-words bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">{p.rawBodySnippet || "—"}</p></div>
                    {p.matchedOrderNumber && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Link2 size={14} className="text-[#4B2D8E]" />
                        <span className="text-gray-400">Matched:</span>
                        <Link href={`/admin/orders/${p.matchedOrderId}`} className="font-mono text-[#4B2D8E] hover:underline">{p.matchedOrderNumber}</Link>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
