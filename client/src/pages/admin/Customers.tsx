import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Users, Search, Eye, X, Crown, User, Lock, Unlock, Trash2,
  KeyRound, Star, Save,
  Package, Phone, Mail, Calendar, Clock, Plus, Minus,
  FileText, UserPlus, MapPin, Globe, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Tab = "profile" | "orders" | "security" | "points" | "notes";

// ─── Customer Detail Modal ────────────────────────────────────────────────────
function CustomerModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const utils = trpc.useUtils();

  const { data: user, isLoading } = trpc.admin.users.get.useQuery({ id: userId });
  const { data: orders } = trpc.admin.users.orders.useQuery({ id: userId });

  // ── Profile edit state ──
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editIdVerified, setEditIdVerified] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  // ── Notes state ──
  const [adminNotes, setAdminNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  // ── Security state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");

  // ── Points state ──
  const [pointsDelta, setPointsDelta] = useState("");
  const [pointsReason, setPointsReason] = useState("");

  // Populate form when user loads
  const populated = useState(false);
  if (user && !populated[0]) {
    populated[1](true);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditBirthday((user as any).birthday || "");
    setEditRole((user.role as "user" | "admin") || "user");
    setEditIdVerified(user.idVerified || false);
    setAdminNotes((user as any).adminNotes || "");
  }

  // ── Mutations ──
  const updateMut = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      utils.admin.users.get.invalidate({ id: userId });
      utils.admin.users.list.invalidate();
      toast.success("Customer updated");
      setProfileDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const lockMut = trpc.admin.users.lock.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.users.get.invalidate({ id: userId });
      utils.admin.users.list.invalidate();
      toast.success(vars.locked ? "Account locked" : "Account unlocked");
      setLockReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPwMut = trpc.admin.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset — customer will need to use OTP login");
      setNewPassword(""); setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.admin.users.delete.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      toast.success("Customer account deleted");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const pointsMut = trpc.admin.users.adjustPoints.useMutation({
    onSuccess: (res) => {
      utils.admin.users.get.invalidate({ id: userId });
      utils.admin.users.list.invalidate();
      toast.success(`Points updated — new balance: ${res.newPoints}`);
      setPointsDelta(""); setPointsReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const notesMut = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      utils.admin.users.get.invalidate({ id: userId });
      toast.success("Notes saved");
      setNotesDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const isLocked = !!(user as any)?.isLocked;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={14} /> },
    { id: "orders", label: "Orders", icon: <Package size={14} /> },
    { id: "points", label: "Points", icon: <Star size={14} /> },
    { id: "security", label: "Security", icon: <KeyRound size={14} /> },
    { id: "notes", label: "Notes", icon: <FileText size={14} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${isLocked ? "bg-red-500" : "bg-[#4B2D8E]"}`}>
              {isLocked ? <Lock size={16} /> : <User size={16} />}
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base leading-tight">{user?.name || "Customer"}</h2>
              <p className="text-xs text-gray-400">{user?.email || user?.phone || `#${userId}`}</p>
            </div>
            {isLocked && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium flex items-center gap-1">
                <Lock size={10} /> Locked
              </span>
            )}
            {user?.role === "admin" && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-[#4B2D8E]/10 text-[#4B2D8E] text-xs font-medium flex items-center gap-1">
                <Crown size={10} /> Admin
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-[#4B2D8E] text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : !user ? (
          <div className="p-10 text-center text-gray-400">Customer not found</div>
        ) : (
          <div className="p-6">

            {/* ── PROFILE TAB ── */}
            {tab === "profile" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input value={editName} onChange={e => { setEditName(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={editEmail} onChange={e => { setEditEmail(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input value={editPhone} onChange={e => { setEditPhone(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                    <input type="date" value={editBirthday} onChange={e => { setEditBirthday(e.target.value); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <select value={editRole} onChange={e => { setEditRole(e.target.value as "user" | "admin"); setProfileDirty(true); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 bg-white">
                      <option value="user">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-xs font-medium text-gray-600">ID Verified</label>
                    <button
                      onClick={() => { setEditIdVerified(v => !v); setProfileDirty(true); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIdVerified ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editIdVerified ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <span className={`text-xs ${editIdVerified ? "text-green-600" : "text-gray-400"}`}>
                      {editIdVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                </div>

                {/* Read-only info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {[
                    { label: "Joined", value: fmtDate(user.createdAt), icon: <Calendar size={12} /> },
                    { label: "Last Active", value: fmtDate(user.lastSignedIn), icon: <Clock size={12} /> },
                    { label: "Reward Points", value: String(user.rewardPoints ?? 0), icon: <Star size={12} /> },
                    { label: "Login Method", value: (user as any).loginMethod || "email", icon: <Mail size={12} /> },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1 text-gray-400 mb-0.5">{item.icon}<span className="text-xs">{item.label}</span></div>
                      <p className="text-sm font-medium text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* IP & Geo Location */}
                {((user as any).lastIp || (user as any).registrationIp) && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-1.5"><Globe size={12} /> IP & Location</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {(user as any).lastIp && (
                        <div>
                          <span className="text-gray-400">Last IP:</span>{" "}
                          <span className="font-mono text-gray-700">{(user as any).lastIp}</span>
                        </div>
                      )}
                      {(user as any).registrationIp && (
                        <div>
                          <span className="text-gray-400">Registration IP:</span>{" "}
                          <span className="font-mono text-gray-700">{(user as any).registrationIp}</span>
                        </div>
                      )}
                      {((user as any).lastGeoCity || (user as any).lastGeoRegion || (user as any).lastGeoCountry) && (
                        <div className="col-span-2 flex items-center gap-1.5">
                          <MapPin size={12} className="text-blue-500" />
                          <span className="text-gray-700">
                            {[(user as any).lastGeoCity, (user as any).lastGeoRegion, (user as any).lastGeoCountry].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  disabled={!profileDirty || updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: userId, name: editName, email: editEmail, phone: editPhone, birthday: editBirthday, role: editRole, idVerified: editIdVerified })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors disabled:opacity-40"
                >
                  <Save size={14} /> Save Changes
                </button>
              </div>
            )}

            {/* ── ORDERS TAB ── */}
            {tab === "orders" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{orders?.length ?? 0} orders matched to this customer</p>
                {!orders?.length ? (
                  <div className="text-center py-10 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No orders found for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{fmtDateTime(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800">${order.total}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === "delivered" ? "bg-green-100 text-green-700" :
                            order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                            order.status === "confirmed" ? "bg-purple-100 text-purple-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── POINTS TAB ── */}
            {tab === "points" && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-[#4B2D8E]/10 to-[#F15929]/10 rounded-2xl p-5 text-center">
                  <Star size={28} className="mx-auto mb-2 text-[#4B2D8E]" />
                  <p className="text-3xl font-bold text-[#4B2D8E]">{user.rewardPoints ?? 0}</p>
                  <p className="text-sm text-gray-500">Current reward points balance</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Adjust Points Balance</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPointsDelta(v => String(Number(v || 0) - 10))} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Minus size={14} /></button>
                    <input
                      type="number"
                      value={pointsDelta}
                      onChange={e => setPointsDelta(e.target.value)}
                      placeholder="+50 or -25"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
                    />
                    <button onClick={() => setPointsDelta(v => String(Number(v || 0) + 10))} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Plus size={14} /></button>
                  </div>
                  <input
                    value={pointsReason}
                    onChange={e => setPointsReason(e.target.value)}
                    placeholder="Reason (e.g. loyalty bonus, refund adjustment)"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
                  />
                  {pointsDelta && Number(pointsDelta) !== 0 && (
                    <p className="text-xs text-gray-500">
                      New balance will be: <strong>{Math.max(0, (user.rewardPoints ?? 0) + Number(pointsDelta))}</strong> points
                    </p>
                  )}
                  <button
                    disabled={!pointsDelta || Number(pointsDelta) === 0 || !pointsReason.trim() || pointsMut.isPending}
                    onClick={() => pointsMut.mutate({ id: userId, delta: Number(pointsDelta), reason: pointsReason })}
                    className="w-full py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors disabled:opacity-40"
                  >
                    Apply Points Adjustment
                  </button>
                </div>
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {tab === "security" && (
              <div className="space-y-6">

                {/* Lock / Unlock */}
                <div className={`p-4 rounded-xl border-2 ${isLocked ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm flex items-center gap-2">
                        {isLocked ? <Lock size={14} className="text-red-500" /> : <Unlock size={14} className="text-green-500" />}
                        Account Access
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isLocked ? "This account is currently locked. The customer cannot log in." : "Account is active. Customer can log in normally."}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isLocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                      {isLocked ? "Locked" : "Active"}
                    </span>
                  </div>
                  {!isLocked && (
                    <input
                      value={lockReason}
                      onChange={e => setLockReason(e.target.value)}
                      placeholder="Reason for locking (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                  )}
                  <button
                    disabled={lockMut.isPending}
                    onClick={() => lockMut.mutate({ id: userId, locked: !isLocked, reason: lockReason || undefined })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                      isLocked
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {isLocked ? <><Unlock size={14} /> Unlock Account</> : <><Lock size={14} /> Lock Account</>}
                  </button>
                </div>

                {/* Reset Password */}
                <div className="p-4 rounded-xl border border-gray-200 space-y-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm flex items-center gap-2"><KeyRound size={14} /> Reset Password</p>
                    <p className="text-xs text-gray-500 mt-0.5">Sets a new password for the customer's account. They can also log in via OTP at any time.</p>
                  </div>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password (min. 8 characters)"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                  <button
                    disabled={!newPassword || newPassword.length < 8 || newPassword !== confirmPassword || resetPwMut.isPending}
                    onClick={() => resetPwMut.mutate({ id: userId, newPassword })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors disabled:opacity-40"
                  >
                    <KeyRound size={14} /> Reset Password
                  </button>
                </div>

                {/* Delete Account */}
                <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 space-y-3">
                  <div>
                    <p className="font-medium text-red-700 text-sm flex items-center gap-2"><Trash2 size={14} /> Delete Account</p>
                    <p className="text-xs text-red-500 mt-0.5">Permanently removes this customer account. This cannot be undone.</p>
                  </div>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                      <Trash2 size={14} /> Delete Account
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Type <strong>DELETE</strong> to confirm:</p>
                      <input value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)}
                        placeholder='Type "DELETE"'
                        className="w-full px-3 py-2 rounded-lg border border-red-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                      <div className="flex gap-2">
                        <button
                          disabled={deleteTyped !== "DELETE" || deleteMut.isPending}
                          onClick={() => deleteMut.mutate({ id: userId, confirm: true })}
                          className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors">
                          Confirm Delete
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteTyped(""); }}
                          className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── NOTES TAB ── */}
            {tab === "notes" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><FileText size={14} /> Admin Notes</p>
                  <p className="text-xs text-gray-400 mb-3">Internal notes visible only to admins. Automatically appended with lock/unlock and password reset events.</p>
                  <textarea
                    value={adminNotes}
                    onChange={e => { setAdminNotes(e.target.value); setNotesDirty(true); }}
                    rows={10}
                    placeholder="Add internal notes about this customer…"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
                  />
                </div>
                <button
                  disabled={!notesDirty || notesMut.isPending}
                  onClick={() => notesMut.mutate({ id: userId, adminNotes })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors disabled:opacity-40"
                >
                  <Save size={14} /> Save Notes
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add User Modal ──────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState("");

  const createMut = trpc.admin.users.create.useMutation({
    onSuccess: () => {
      toast.success(`${role === "admin" ? "Admin" : "Customer"} created! Welcome email sent.`);
      onSuccess();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || firstName.trim().length < 2) { setError("First name must be at least 2 characters"); return; }
    if (!lastName.trim() || lastName.trim().length < 2) { setError("Last name must be at least 2 characters"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email"); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid 10-digit phone number"); return; }
    createMut.mutate({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.replace(/\D/g, ""), role, birthday: birthday || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><UserPlus size={18} className="text-[#4B2D8E]" /> Add User</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="John" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Doe" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone * (Canadian)</label>
            <div className="flex gap-2">
              <span className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">+1</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(416) 555-0123" className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" checked={role === "user"} onChange={() => setRole("user")} className="accent-[#4B2D8E]" />
                <span className="text-sm">Customer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" checked={role === "admin"} onChange={() => setRole("admin")} className="accent-[#4B2D8E]" />
                <span className="text-sm">Admin</span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={createMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#4B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50 transition">
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Create {role === "admin" ? "Admin" : "Customer"} & Send Welcome Email
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Customers Page ──────────────────────────────────────────────────────
export default function AdminCustomers() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  const { data, isLoading } = trpc.admin.users.list.useQuery(
    { page, limit: 20, search: search || undefined },
    { refetchOnWindowFocus: true },
  );
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} registered customers</p>
        </div>
        <button onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-[#4B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#3a2270] transition-colors">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Points</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Users size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{search ? `No customers found for "${search}"` : "No customers yet"}</p>
                  </td>
                </tr>
              ) : data?.data.map((user: any) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 ${user.isLocked ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${user.isLocked ? "bg-red-100" : "bg-[#4B2D8E]/10"}`}>
                        {user.isLocked
                          ? <Lock size={14} className="text-red-500" />
                          : <User size={15} className="text-[#4B2D8E]" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-gray-400">{user.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{user.phone || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {user.role === "admin"
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#4B2D8E]/10 text-[#4B2D8E]"><Crown size={9} /> Admin</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Customer</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {user.isLocked
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600"><Lock size={9} /> Locked</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600"><Unlock size={9} /> Active</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 text-sm hidden lg:table-cell">
                    <span className="flex items-center justify-center gap-1"><Star size={11} className="text-[#F15929]" />{user.rewardPoints ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(user.id)}
                      className="p-2 rounded-lg hover:bg-[#4B2D8E]/10 text-[#4B2D8E] transition-colors"
                      title="View / manage customer"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} · {data?.total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedId !== null && (
        <CustomerModal userId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onSuccess={() => utils.admin.users.list.invalidate()} />
      )}
    </div>
  );
}
