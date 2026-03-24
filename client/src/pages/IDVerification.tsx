import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Upload, CheckCircle, Clock, AlertCircle, Camera, FileText, Smartphone, QrCode, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';

export default function IDVerification() {
  const { user, isAuthenticated, submitIdVerification, updateProfile } = useAuth();
  const { idVerificationEnabled } = useSiteConfig();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailError, setGuestEmailError] = useState('');

  // Submission tracking
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  // QR Code Bridge
  const [qrUrl, setQrUrl] = useState('');
  const [qrActive, setQrActive] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileTokenRef = useRef<string>('');

  // Lazy-load QRious only when this page mounts — keeps it off the global bundle
  useEffect(() => {
    if ((window as any).QRious) return; // already loaded
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
    script.async = true;
    document.head.appendChild(script);
    return () => { /* leave cached — no need to remove */ };
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Check for existing verification on mount (for logged-in users)
  useEffect(() => {
    const email = user?.email || '';
    if (!email) return;
    fetch(`/api/verify/check?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.id && data.status) {
          setSubmittedId(data.id);
          // Normalize status: DB stores 'pending', frontend expects 'pending' or 'pending_review'
          setSubmittedStatus(data.status === 'pending' ? 'pending_review' : data.status);
          if (data.status === 'approved') {
            updateProfile({ idVerified: true, idVerificationStatus: 'approved' });
          } else if (data.status === 'pending') {
            updateProfile({ idVerificationStatus: 'pending' });
          } else if (data.status === 'rejected') {
            updateProfile({ idVerificationStatus: 'rejected' });
          }
        }
      })
      .catch(() => {});
  }, [user?.email]);

  // Check for vtoken in URL (returning from email approval link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('vtoken');
    if (!token) return;
    fetch(`/api/verify/check?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'approved') {
          setSubmittedStatus('approved');
          if (isAuthenticated) {
            updateProfile({ idVerified: true, idVerificationStatus: 'approved' });
          }
          toast.success('Your ID has been approved! You can now place orders.');
        }
      })
      .catch(() => {});
  }, []);

  // ============================================================
  // FEATURE DISABLED — show friendly message
  // ============================================================
  if (!idVerificationEnabled) {
    return (
      <>
        <SEOHead title="ID Verification" noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </motion.div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">NO VERIFICATION NEEDED</h1>
            <p className="text-gray-600 font-body mb-6">ID verification is not currently required. You can place orders directly.</p>
            <Link href="/shop" className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full hover:bg-[#d94d22] transition-all">START SHOPPING</Link>
          </div>
        </section>
      </>
    );
  }

  // ============================================================
  // APPROVED
  // ============================================================
  if ((isAuthenticated && user?.idVerified) || submittedStatus === 'approved') {
    return (
      <>
        <SEOHead title="ID Verified" noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </motion.div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">ID VERIFIED</h1>
            <p className="text-gray-600 font-body mb-2">Your identity has been verified. You can now place orders.</p>
            {isAuthenticated && <p className="text-sm text-gray-400 font-body mb-6">This is a one-time verification — you won't need to verify again.</p>}
            <Link href="/shop" className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full hover:bg-[#d94d22] transition-all">START SHOPPING</Link>
          </div>
        </section>
      </>
    );
  }

  // ============================================================
  // PENDING REVIEW
  // ============================================================
  if (
    submittedId && (submittedStatus === 'pending_review') ||
    (isAuthenticated && user?.idVerificationStatus === 'pending')
  ) {
    return (
      <>
        <SEOHead title="ID Under Review" noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Clock size={40} className="text-yellow-600" />
            </div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">VERIFICATION UNDER REVIEW</h1>
            <p className="text-gray-600 font-body mb-2">Your ID has been submitted and is being reviewed by our team.</p>
            <p className="text-sm text-gray-400 font-body mb-6">You'll receive an email once the review is complete.</p>
            <div className="bg-[#F5F5F5] rounded-xl p-5 text-left mb-6">
              <h3 className="font-display text-xs text-gray-500 mb-4 tracking-wider">WHAT HAPPENS NEXT</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0"><CheckCircle size={16} className="text-green-600" /></div>
                  <div><p className="text-sm font-body font-semibold text-[#333]">ID Uploaded</p><p className="text-xs text-gray-400 font-body">Document securely received</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0"><Clock size={16} className="text-yellow-600" /></div>
                  <div><p className="text-sm font-body font-semibold text-[#333]">Under Review</p><p className="text-xs text-gray-400 font-body">Our team is reviewing your document</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><Mail size={16} className="text-gray-400" /></div>
                  <div><p className="text-sm font-body text-gray-400">Email notification with result</p></div>
                </div>
              </div>
            </div>
            {submittedId && <p className="text-xs text-gray-300 font-body mb-4">Reference: #{submittedId}</p>}
            <Link href="/shop" className="text-[#4B2D8E] font-display text-sm hover:text-[#F15929]">← CONTINUE BROWSING</Link>
          </div>
        </section>
      </>
    );
  }

  // ============================================================
  // REJECTED
  // ============================================================
  if (submittedStatus === 'rejected' || (isAuthenticated && user?.idVerificationStatus === 'rejected')) {
    return (
      <>
        <SEOHead title="ID Verification — Rejected" noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-600" />
            </div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">VERIFICATION UNSUCCESSFUL</h1>
            <p className="text-gray-600 font-body mb-6">We were unable to verify your ID. Please try again with a clear, well-lit photo.</p>
            <button
              onClick={() => { setSubmittedId(null); setSubmittedStatus(null); setFrontFile(null); if (isAuthenticated) updateProfile({ idVerificationStatus: 'none' }); }}
              className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full hover:bg-[#d94d22] transition-all inline-flex items-center gap-2">
              <Upload size={18} /> TRY AGAIN
            </button>
          </div>
        </section>
      </>
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================
  const validateEmail = () => {
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setGuestEmailError('A valid email address is required.');
      return false;
    }
    setGuestEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!frontFile) { toast.error('Please upload a photo of your ID'); return; }
    if (!isAuthenticated && !validateEmail()) return;

    setSubmitting(true);
    try {
      if (isAuthenticated && submitIdVerification) {
        // Use tRPC path for authenticated users
        const selfie = null;
        const result = await submitIdVerification(frontFile, selfie);
        if (result === true) {
          setSubmittedStatus('pending_review');
          setSubmittedId('submitted');
          toast.success('ID submitted for review!');
        } else {
          toast.error(result as string);
        }
      } else {
        // Guest path — REST API (saves to shared DB, admin sees it at /admin/verifications)
        const formData = new FormData();
        formData.append('id_document', frontFile);
        formData.append('email', guestEmail);
        formData.append('documentType', 'government_id');

        const res = await fetch('/api/verify/submit', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
          setSubmittedId(String(data.verificationId));
          setSubmittedStatus('pending_review');
          toast.success('ID submitted for review!');
        } else {
          toast.error(data.error || 'Submission failed');
        }
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    }
    setSubmitting(false);
  };

  const generateQR = async () => {
    const email = isAuthenticated ? (user?.email || '') : guestEmail;
    if (!isAuthenticated && !validateEmail()) return;

    try {
      const res = await fetch('/api/verify/mobile-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId: user?.id || null }),
      });
      const data = await res.json();

      if (data.success) {
        mobileTokenRef.current = data.mobileToken;
        setQrUrl(data.mobileUrl);
        setQrActive(true);

        // Render QR code using QRious library loaded from CDN
        setTimeout(() => {
          if (qrCanvasRef.current) {
            const w = window as any;
            if (w.QRious) {
              new w.QRious({
                element: qrCanvasRef.current,
                value: data.mobileUrl,
                size: 180,
                foreground: '#1a1a1a',
                background: '#ffffff',
                level: 'M',
              });
            }
          }
        }, 100);

        // Start polling for mobile submission
        startPolling(data.mobileToken);
      }
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const startPolling = (token: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/mobile-poll/${token}`);
        const data = await res.json();
        if (data.status === 'submitted') {
          if (pollRef.current) clearInterval(pollRef.current);
          setSubmittedId(String(data.verificationId));
          setSubmittedStatus('pending');
          if (isAuthenticated) updateProfile({ idVerificationStatus: 'pending' });
          toast.success('ID uploaded from your phone and submitted for review!');
        } else if (data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
          setQrActive(false);
        }
      } catch {}
    }, 3000);

    // Auto-stop after 30 min
    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 30 * 60 * 1000);
  };

  // ============================================================
  // UPLOAD FORM
  // ============================================================
  return (
    <>
      <SEOHead title="Verify Your ID" description="Upload your government-issued ID to verify your age (19+)." noindex />
      <section className="container py-6 md:py-10">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          ...(isAuthenticated ? [{ label: 'Account', href: '/account' }] : []),
          { label: 'Verify ID' }
        ]} />
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={24} className="text-[#4B2D8E]" />
            <h1 className="font-display text-2xl md:text-3xl text-[#4B2D8E]">VERIFY YOUR ID</h1>
          </div>
          <p className="text-gray-600 font-body mb-6">Canadian law requires you to be 19+ to purchase cannabis. Upload a valid government-issued photo ID for review by our team.</p>

          {/* Guest email */}
          {!isAuthenticated && (
            <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-4 mb-6">
              <label className="font-display text-sm text-[#4B2D8E] block mb-1">YOUR EMAIL ADDRESS</label>
              <p className="text-xs text-gray-500 font-body mb-3">We'll email you when your ID has been reviewed so you can return and complete your order.</p>
              <input
                type="email"
                value={guestEmail}
                onChange={e => { setGuestEmail(e.target.value); setGuestEmailError(''); }}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 rounded-lg border-2 font-body text-sm transition-colors ${guestEmailError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#4B2D8E]'} outline-none`}
              />
              {guestEmailError && <p className="text-xs text-red-500 font-body mt-1">{guestEmailError}</p>}
              <p className="text-xs text-gray-400 font-body mt-2">
                Already have an account? <Link href="/account/login" className="text-[#4B2D8E] hover:underline font-semibold">Sign in</Link> for one-time verification.
              </p>
            </div>
          )}

          {/* Accepted IDs */}
          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
            <h3 className="font-display text-sm text-[#4B2D8E] mb-2">ACCEPTED ID TYPES</h3>
            <ul className="text-sm font-body text-gray-600 space-y-1">
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Canadian Driver's Licence</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Canadian Passport</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Provincial ID Card</li>
            </ul>
          </div>

          {/* Upload area */}
          <div className="mb-6">
            <label className="font-display text-sm text-[#4B2D8E] mb-2 block">GOVERNMENT-ISSUED ID *</label>
            <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${frontFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#4B2D8E] bg-[#F5F5F5]'}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setFrontFile(e.target.files?.[0] || null)} />
              {frontFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={24} className="text-green-500" />
                  <div>
                    <p className="font-display text-sm text-green-700">{frontFile.name}</p>
                    <p className="text-xs text-green-600 font-body">Click to change</p>
                  </div>
                </div>
              ) : (
                <>
                  <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="font-display text-sm text-gray-500">TAP TO UPLOAD OR DRAG & DROP</p>
                  <p className="text-xs text-gray-400 font-body mt-1">JPG, PNG, WebP — Max 10MB</p>
                </>
              )}
            </label>
          </div>

          {/* QR Code Bridge — desktop only */}
          <div className="hidden md:block mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-display text-gray-400 tracking-widest">OR USE YOUR PHONE</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="bg-[#F5F5F5] border border-gray-200 rounded-xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Smartphone size={18} className="text-[#4B2D8E]" />
                <span className="font-display text-sm text-[#4B2D8E]">USE YOUR PHONE TO TAKE A PHOTO</span>
              </div>
              <p className="text-xs text-gray-500 font-body mb-4">Scan this QR code with your phone to open the camera and photograph your ID directly.</p>
              {!qrActive ? (
                <button
                  onClick={generateQR}
                  disabled={!isAuthenticated && !guestEmail}
                  className="bg-[#4B2D8E] hover:bg-[#3a2270] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-display text-sm py-2.5 px-6 rounded-full transition-all inline-flex items-center gap-2">
                  <QrCode size={16} /> Generate QR Code
                </button>
              ) : (
                <div>
                  <div className="inline-block bg-white p-3 rounded-xl shadow-sm border mb-3">
                    <canvas ref={qrCanvasRef} width={180} height={180} className="block" />
                  </div>
                  <p className="text-xs text-gray-400 font-body mb-2 break-all">{qrUrl}</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-body">
                    <div className="w-2 h-2 rounded-full bg-[#4B2D8E] animate-pulse" />
                    Waiting for photo from your phone...
                  </div>
                  <button onClick={generateQR} className="text-xs text-[#4B2D8E] hover:underline font-body mt-2 inline-block">Generate a new code</button>
                </div>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6 flex gap-3">
            <Shield size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 font-body">
              Your ID is stored securely and only reviewed by authorized staff. Images are automatically deleted after the retention period.{' '}
              <Link href="/privacy-policy" className="text-[#4B2D8E] hover:underline">Privacy Policy</Link>.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!frontFile || submitting || (!isAuthenticated && !guestEmail)}
            className={`w-full font-display py-3.5 rounded-full transition-all flex items-center justify-center gap-2 ${frontFile && !submitting && (isAuthenticated || guestEmail) ? 'bg-[#F15929] hover:bg-[#d94d22] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {submitting
              ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> SUBMITTING...</>)
              : (<><Upload size={18} /> SUBMIT FOR REVIEW</>)
            }
          </button>
        </div>
      </section>
    </>
  );
}
