import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  MessageSquare, Search, Star, Eye, X, Check, XCircle,
  Pencil, Trash2, ChevronLeft, ChevronRight, Filter,
  ThumbsUp, ThumbsDown, Save, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? "fill-[#F15929] text-[#F15929]" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange, size = 20 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={(hover || value) >= s ? "fill-[#F15929] text-[#F15929]" : "fill-gray-200 text-gray-200"}
          />
        </button>
      ))}
    </div>
  );
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cls[color] || cls.gray}`}>
      {children}
    </span>
  );
}

const TAG_LABELS: Record<string, string> = {
  smooth: "Smooth", strong: "Strong", mild: "Mild", relaxing: "Relaxing",
  energizing: "Energizing", flavorful: "Flavorful", harsh: "Harsh",
  "good-value": "Good Value", potent: "Potent", "beginner-friendly": "Beginner Friendly",
  fruity: "Fruity", earthy: "Earthy", sweet: "Sweet", gassy: "Gassy",
  "long-lasting": "Long Lasting", "fast-acting": "Fast Acting",
};

const EFFECT_LABELS: Record<string, string> = {
  relaxing: "Relaxing", sleepy: "Sleepy", euphoric: "Euphoric",
  focused: "Focused", creative: "Creative", social: "Social",
  "pain-relief": "Pain Relief", "anxiety-relief": "Anxiety Relief",
  hungry: "Hungry", uplifting: "Uplifting",
};

// ─── Edit Review Modal ─────────────────────────────────────────────
function EditReviewModal({ reviewId, onClose }: { reviewId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: review, isLoading } = trpc.admin.reviews.get.useQuery({ id: reviewId });

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isApproved, setIsApproved] = useState(true);
  const [populated, setPopulated] = useState(false);

  if (review && !populated) {
    setPopulated(true);
    setRating(review.rating);
    setTitle(review.title || "");
    setBody(review.body || "");
    setIsApproved(review.isApproved);
  }

  const updateMut = trpc.admin.reviews.update.useMutation({
    onSuccess: () => {
      utils.admin.reviews.list.invalidate();
      toast.success("Review updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.admin.reviews.delete.useMutation({
    onSuccess: () => {
      utils.admin.reviews.list.invalidate();
      toast.success("Review deleted");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
          <div className="flex justify-center"><div className="w-8 h-8 border-4 border-[#4B2D8E] border-t-transparent rounded-full animate-spin" /></div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center">
          <p className="text-gray-500">Review not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pencil size={18} className="text-[#4B2D8E]" />
            Edit Review #{review.id}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Meta info */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <p><span className="text-gray-500">User ID:</span> {review.userId}</p>
            <p><span className="text-gray-500">Product ID:</span> {review.productId}</p>
            <p><span className="text-gray-500">Created:</span> {fmtDate(review.createdAt)}</p>
            <p><span className="text-gray-500">Points Awarded:</span> {review.pointsAwarded ? "Yes" : "No"}</p>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <StarInput value={rating} onChange={setRating} size={28} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]"
              maxLength={255}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] resize-none"
              rows={4} maxLength={2000}
            />
          </div>

          {/* Approval Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsApproved(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border transition-all ${
                  isApproved ? "bg-green-50 border-green-300 text-green-700" : "border-gray-300 text-gray-500"
                }`}
              >
                <Check size={14} /> Approved
              </button>
              <button
                type="button"
                onClick={() => setIsApproved(false)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border transition-all ${
                  !isApproved ? "bg-red-50 border-red-300 text-red-700" : "border-gray-300 text-gray-500"
                }`}
              >
                <XCircle size={14} /> Hidden
              </button>
            </div>
          </div>

          {/* Tags display (read-only in admin) */}
          {review.tags && (review.tags as string[]).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descriptor Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {(review.tags as string[]).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {TAG_LABELS[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {review.effectTags && (review.effectTags as string[]).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effect Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {(review.effectTags as string[]).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    {EFFECT_LABELS[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Structured data display */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {review.strengthRating && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs">Strength</span>
                <p className="font-semibold">{review.strengthRating}/5</p>
              </div>
            )}
            {review.smoothnessRating && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs">Smoothness</span>
                <p className="font-semibold">{review.smoothnessRating}/5</p>
              </div>
            )}
            {review.experienceLevel && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs">Experience</span>
                <p className="font-semibold capitalize">{review.experienceLevel}</p>
              </div>
            )}
            {review.usageTiming && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs">Timing</span>
                <p className="font-semibold capitalize">{review.usageTiming}</p>
              </div>
            )}
          </div>

          {review.wouldRecommend !== null && review.wouldRecommend !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Would recommend:</span>
              {review.wouldRecommend ? (
                <span className="text-green-600 flex items-center gap-1"><ThumbsUp size={14} /> Yes</span>
              ) : (
                <span className="text-red-500 flex items-center gap-1"><ThumbsDown size={14} /> No</span>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm text-red-600">Permanently delete?</span>
                <button
                  onClick={() => deleteMut.mutate({ id: review.id })}
                  disabled={deleteMut.isPending}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  {deleteMut.isPending ? "..." : "Yes, Delete"}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={() => updateMut.mutate({ id: review.id, rating, title: title.trim() || undefined, body: body.trim() || undefined, isApproved })}
              disabled={updateMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm hover:bg-[#3d2574] disabled:opacity-50"
            >
              <Save size={14} />
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function AdminReviews() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending">("all");
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.admin.reviews.list.useQuery({ page, limit: 20 });
  const utils = trpc.useUtils();

  const approveMut = trpc.admin.reviews.approve.useMutation({
    onSuccess: () => { utils.admin.reviews.list.invalidate(); toast.success("Review approved"); },
    onError: (e) => toast.error(e.message),
  });

  const unapproveMut = trpc.admin.reviews.unapprove.useMutation({
    onSuccess: () => { utils.admin.reviews.list.invalidate(); toast.success("Review hidden"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.admin.reviews.delete.useMutation({
    onSuccess: () => { utils.admin.reviews.list.invalidate(); toast.success("Review deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const reviews = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Client-side filter
  const filtered = reviews.filter((r: any) => {
    if (filterStatus === "approved" && !r.isApproved) return false;
    if (filterStatus === "pending" && r.isApproved) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.body || "").toLowerCase().includes(q) ||
        String(r.productId).includes(q) ||
        String(r.userId).includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <MessageSquare size={24} className="text-[#4B2D8E]" />
            Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} total review{total !== 1 ? "s" : ""} — manage customer feedback
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, body, product ID, or user ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:border-transparent"
          />
        </div>
        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "approved", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === f
                  ? "bg-[#4B2D8E] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter size={14} className="inline mr-1" />
              {f === "all" ? "All" : f === "approved" ? "Approved" : "Pending/Hidden"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#4B2D8E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No reviews found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Title / Body</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Tags</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">#{r.id}</td>
                    <td className="py-3 px-4"><StarDisplay value={r.rating} /></td>
                    <td className="py-3 px-4 max-w-[200px]">
                      {r.title && <p className="font-medium text-gray-800 truncate">{r.title}</p>}
                      {r.body && <p className="text-gray-500 text-xs truncate">{r.body.substring(0, 60)}{r.body.length > 60 ? "..." : ""}</p>}
                      {!r.title && !r.body && <span className="text-gray-300 italic">No text</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {r.tags && (r.tags as string[]).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            {TAG_LABELS[tag] || tag}
                          </span>
                        ))}
                        {r.tags && (r.tags as string[]).length > 3 && (
                          <span className="text-[9px] text-gray-400">+{(r.tags as string[]).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">#{r.userId}</td>
                    <td className="py-3 px-4 text-gray-600">#{r.productId}</td>
                    <td className="py-3 px-4">
                      {r.isApproved ? (
                        <Badge color="green">Approved</Badge>
                      ) : (
                        <Badge color="yellow">Hidden</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle approval */}
                        {r.isApproved ? (
                          <button
                            onClick={() => unapproveMut.mutate({ id: r.id })}
                            disabled={unapproveMut.isPending}
                            className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                            title="Hide review"
                          >
                            <XCircle size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => approveMut.mutate({ id: r.id })}
                            disabled={approveMut.isPending}
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                            title="Approve review"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {/* Edit */}
                        <button
                          onClick={() => setEditId(r.id)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit review"
                        >
                          <Pencil size={16} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm("Delete this review permanently?")) {
                              deleteMut.mutate({ id: r.id });
                            }
                          }}
                          disabled={deleteMut.isPending}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editId !== null && (
        <EditReviewModal reviewId={editId} onClose={() => setEditId(null)} />
      )}
    </div>
  );
}
