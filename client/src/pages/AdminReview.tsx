import { useState, useEffect, useCallback } from 'react';
import SEOHead from '@/components/SEOHead';
import { Shield, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Verification {
  id: string;
  email: string;
  userId: string | null;
  status: string;
  imagePath: string;
  documentType: string;
  rejectionReason: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  ip: string;
}

export default function AdminReview() {
  const [key, setKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('pending_review');
  const [loading, setLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Check URL param for key
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('key');
    if (urlKey) {
      setKey(urlKey);
      setAuthenticated(true);
    }
  }, []);

  const fetchVerifications = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications?key=${encodeURIComponent(key)}&status=${filter}`);
      if (res.status === 401) { setAuthenticated(false); toast.error('Invalid admin key'); return; }
      const data = await res.json();
      setVerifications(data.verifications || []);
      setPendingCount(data.pending || 0);
    } catch { toast.error('Failed to load verifications'); }
    setLoading(false);
  }, [key, filter]);

  useEffect(() => {
    if (authenticated && key) fetchVerifications();
  }, [authenticated, key, filter, fetchVerifications]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(fetchVerifications, 15000);
    return () => clearInterval(interval);
  }, [authenticated, fetchVerifications]);

  const handleReview = async (id: string, decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id, decision, reason: rejectReason, notes: notes[id] || '' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setRejectId(null);
        setRejectReason('');
        fetchVerifications();
      } else {
        toast.error(data.error || 'Review failed');
      }
    } catch { toast.error('Network error'); }
  };

  // ============================================================
  // LOGIN
  // ============================================================
  if (!authenticated) {
    return (
      <>
        <SEOHead title="Admin — ID Verification Review" noindex />
        <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
            <div className="text-center mb-6">
              <Shield size={32} className="text-[#4B2D8E] mx-auto mb-3" />
              <h1 className="font-display text-xl text-[#4B2D8E]">ADMIN REVIEW</h1>
              <p className="text-xs text-gray-500 font-body mt-1">My Legacy Cannabis — ID Verification</p>
            </div>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Admin key"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 font-body text-sm focus:border-[#4B2D8E] outline-none mb-4"
              onKeyDown={e => { if (e.key === 'Enter') setAuthenticated(true); }}
            />
            <button
              onClick={() => setAuthenticated(true)}
              className="w-full bg-[#4B2D8E] text-white font-display py-3 rounded-lg hover:bg-[#3a2270] transition-all">
              SIGN IN
            </button>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  const statusColors: Record<string, string> = {
    pending_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <>
      <SEOHead title="Admin — ID Verification Review" noindex />
      <div className="min-h-screen bg-[#f4f4f0]">
        {/* Header */}
        <div className="bg-[#4B2D8E] text-white py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} />
            <span className="font-display text-sm tracking-wide">ID VERIFICATION — ADMIN REVIEW</span>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="bg-[#F15929] text-white text-xs font-display px-3 py-1 rounded-full animate-pulse">
                {pendingCount} PENDING
              </span>
            )}
            <button onClick={fetchVerifications} className="text-white/70 hover:text-white transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['pending_review', 'approved', 'rejected', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-display text-xs transition-all ${filter === f ? 'bg-[#4B2D8E] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                {f === 'pending_review' ? 'Pending' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending_review' && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          {/* Verifications list */}
          {verifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <p className="text-gray-400 font-body">No verifications found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map(v => (
                <div key={v.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  {/* Card header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#fafaf8]">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm text-[#4B2D8E]">#{v.id}</span>
                      <span className="text-sm font-body text-gray-500">{v.email}</span>
                      {v.userId && <span className="bg-blue-50 text-blue-600 text-[10px] font-display px-2 py-0.5 rounded-full">REGISTERED</span>}
                      {!v.userId && <span className="bg-orange-50 text-orange-600 text-[10px] font-display px-2 py-0.5 rounded-full">GUEST</span>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-display ${statusColors[v.status] || 'bg-gray-100 text-gray-600'}`}>
                      {v.status === 'pending_review' ? 'PENDING' : v.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    {/* ID Image */}
                    <div className="md:w-72 shrink-0">
                      <img
                        src={`/api/admin/image/${v.imagePath}?key=${encodeURIComponent(key)}`}
                        alt="Uploaded ID"
                        className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(`/api/admin/image/${v.imagePath}?key=${encodeURIComponent(key)}`, '_blank')}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <p className="text-[10px] text-gray-400 font-body mt-1">Click to enlarge</p>
                    </div>

                    {/* Details + Actions */}
                    <div className="flex-1">
                      <table className="text-sm font-body w-full">
                        <tbody>
                          <tr><td className="text-gray-400 pr-4 py-1 whitespace-nowrap">Submitted:</td><td className="text-gray-700">{new Date(v.createdAt).toLocaleString()}</td></tr>
                          <tr><td className="text-gray-400 pr-4 py-1">IP:</td><td className="text-gray-700">{v.ip}</td></tr>
                          <tr><td className="text-gray-400 pr-4 py-1">Document:</td><td className="text-gray-700">{v.documentType}</td></tr>
                          {v.reviewedAt && <tr><td className="text-gray-400 pr-4 py-1">Reviewed:</td><td className="text-gray-700">{new Date(v.reviewedAt).toLocaleString()}</td></tr>}
                          {v.rejectionReason && <tr><td className="text-gray-400 pr-4 py-1">Reason:</td><td className="text-red-600 font-medium">{v.rejectionReason}</td></tr>}
                          {v.adminNotes && <tr><td className="text-gray-400 pr-4 py-1">Notes:</td><td className="text-gray-600">{v.adminNotes}</td></tr>}
                        </tbody>
                      </table>

                      {v.status === 'pending_review' && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="mb-3">
                            <label className="text-xs text-gray-500 font-body block mb-1">Admin Notes (optional)</label>
                            <textarea
                              value={notes[v.id] || ''}
                              onChange={e => setNotes({ ...notes, [v.id]: e.target.value })}
                              rows={2}
                              className="w-full text-sm font-body border border-gray-200 rounded-lg p-2 focus:border-[#4B2D8E] outline-none"
                            />
                          </div>

                          {rejectId === v.id && (
                            <div className="mb-3">
                              <label className="text-xs text-red-500 font-body block mb-1 font-semibold">Rejection Reason (required)</label>
                              <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                rows={2}
                                placeholder="e.g., Image is blurry, document is expired..."
                                className="w-full text-sm font-body border border-red-300 rounded-lg p-2 focus:border-red-500 outline-none bg-red-50"
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button onClick={() => handleReview(v.id, 'approve')}
                              className="bg-green-500 hover:bg-green-600 text-white font-display text-xs py-2.5 px-5 rounded-lg transition-all flex items-center gap-1.5">
                              <CheckCircle size={14} /> Approve
                            </button>
                            {rejectId === v.id ? (
                              <button onClick={() => handleReview(v.id, 'reject')}
                                className="bg-red-500 hover:bg-red-600 text-white font-display text-xs py-2.5 px-5 rounded-lg transition-all flex items-center gap-1.5">
                                <XCircle size={14} /> Confirm Rejection
                              </button>
                            ) : (
                              <button onClick={() => setRejectId(v.id)}
                                className="border border-red-300 text-red-500 hover:bg-red-50 font-display text-xs py-2.5 px-5 rounded-lg transition-all flex items-center gap-1.5">
                                <XCircle size={14} /> Reject
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
