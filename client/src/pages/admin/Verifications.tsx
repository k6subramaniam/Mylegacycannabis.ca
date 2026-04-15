import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  ShieldCheck,
  ShieldOff,
  Eye,
  Check,
  X,
  User,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useSiteConfig } from "@/hooks/useSiteConfig";

export default function AdminVerifications() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.verifications.list.useQuery(
    { page, limit: 20, status: status || undefined },
    { refetchOnWindowFocus: true }
  );
  const { data: detail } = trpc.admin.verifications.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );
  const reviewMutation = trpc.admin.verifications.review.useMutation({
    onSuccess: () => {
      // Invalidate all related admin queries so changes propagate across pages
      // Use Promise.all to ensure all invalidations complete
      Promise.all([
        utils.admin.verifications.list.invalidate(),
        utils.admin.verifications.get.invalidate({ id: selectedId! }),
        utils.admin.stats.invalidate(), // Dashboard: pending verification count
        utils.admin.orders.list.invalidate(), // Orders list: ID Review badge
        utils.admin.orders.get.invalidate(), // Order detail: held alert
        utils.admin.activityLog.invalidate(), // Activity log: new review entry
      ]).catch(() => {}); // Invalidations are best-effort
      toast.success("Verification reviewed");
      setSelectedId(null);
      setReviewNotes("");
    },
  });

  const { idVerificationEnabled, idVerificationMode } = useSiteConfig();
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  // Treat missing/undefined status as "pending" (records created before status fix)
  const normalizeStatus = (s: string | undefined | null) => s || "pending";

  const statusBadge = (s: string | undefined | null) => {
    const status = normalizeStatus(s);
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ID Verifications</h1>
        <p className="text-sm text-gray-500">
          {data?.total ?? 0} total submissions
        </p>
      </div>

      {/* Banner when ID verification is disabled */}
      {!idVerificationEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldOff size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              ID Verification is currently disabled
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              New customers are not required to verify their ID. You can still
              review existing submissions below.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-100 transition-colors shrink-0"
          >
            Settings
          </Link>
        </div>
      )}

      {/* Banner showing AI mode is active */}
      {idVerificationEnabled && idVerificationMode === "ai" && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={20} className="text-violet-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-violet-800">
              AI Auto-Verification is enabled
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              New ID submissions are automatically reviewed by AI.
              High-confidence approvals happen instantly. Low-confidence
              submissions are flagged for manual review below.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-300 hover:bg-violet-100 transition-colors shrink-0"
          >
            Settings
          </Link>
        </div>
      )}

      <div className="flex gap-3">
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  ID Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                  Submitted
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    <ShieldCheck
                      size={24}
                      className="mx-auto mb-2 opacity-50"
                    />
                    <p className="text-sm">No verifications found</p>
                    <p className="text-xs mt-1">
                      Submissions appear here after users upload their ID on the
                      storefront or at checkout.
                    </p>
                  </td>
                </tr>
              ) : (
                data?.data.map((v: any) => (
                  <tr
                    key={v.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 ${v.status === "pending" ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      #{v.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">
                        {v.guestName || `User #${v.userId}` || "Guest"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.guestEmail || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-sm">
                      {v.idType || "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {new Date(v.createdAt).toLocaleDateString("en-CA")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(v.id)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-[#4B2D8E]"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                Verification #{detail.id}
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#4B2D8E] flex items-center justify-center text-white">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {detail.guestName || `User #${detail.userId}` || "Guest"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {detail.guestEmail || "No email"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ID Type: {detail.idType || "Not specified"} · Submitted:{" "}
                    {new Date(detail.createdAt).toLocaleString("en-CA")}
                  </p>
                </div>
                <div className="ml-auto">{statusBadge(detail.status)}</div>
              </div>

              {/* ID Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Front of ID
                  </p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 min-h-[160px] flex items-center justify-center">
                    {detail.frontImageUrl &&
                    !detail.frontImageUrl.includes("placehold.co") ? (
                      <img
                        src={detail.frontImageUrl}
                        alt="Front of ID"
                        className="w-full h-auto max-h-80 object-contain"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (
                            e.target as HTMLImageElement
                          ).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <p
                      className={`text-sm text-gray-400 p-4 text-center ${detail.frontImageUrl && !detail.frontImageUrl.includes("placehold.co") ? "hidden" : ""}`}
                    >
                      No image on file — submitted before image storage was
                      configured
                    </p>
                  </div>
                </div>
                {detail.selfieImageUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Selfie
                    </p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 min-h-[160px] flex items-center justify-center">
                      {!detail.selfieImageUrl.includes("placehold.co") ? (
                        <img
                          src={detail.selfieImageUrl}
                          alt="Selfie"
                          className="w-full h-auto max-h-80 object-contain"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            (
                              e.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <p
                        className={`text-sm text-gray-400 p-4 text-center ${!detail.selfieImageUrl.includes("placehold.co") ? "hidden" : ""}`}
                      >
                        No image on file — submitted before image storage was
                        configured
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Review Notes */}
              {detail.reviewNotes && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Review Notes
                  </p>
                  <p className="text-sm text-gray-700">{detail.reviewNotes}</p>
                  {detail.reviewedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Reviewed:{" "}
                      {new Date(detail.reviewedAt).toLocaleString("en-CA")}
                    </p>
                  )}
                </div>
              )}

              {/* Review Actions — show for pending or undefined status (legacy records) */}
              {normalizeStatus(detail.status) === "pending" && (
                <div className="space-y-3 pt-2">
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add review notes (optional, required for rejection)..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: selectedId,
                          status: "approved",
                          notes: reviewNotes || undefined,
                        })
                      }
                      disabled={reviewMutation.isPending}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        if (!reviewNotes) {
                          toast.error("Please add a reason for rejection");
                          return;
                        }
                        reviewMutation.mutate({
                          id: selectedId,
                          status: "rejected",
                          notes: reviewNotes,
                        });
                      }}
                      disabled={reviewMutation.isPending}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
