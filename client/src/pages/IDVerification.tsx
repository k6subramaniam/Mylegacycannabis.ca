import { useState } from 'react';
import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Upload, CheckCircle, Clock, AlertCircle, Camera, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function IDVerification() {
  const { user, isAuthenticated, submitIdVerification } = useAuth();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <>
        <SEOHead title="ID Verification" description="Verify your identity to place orders at My Legacy Cannabis." noindex />
        <section className="container py-20 text-center">
          <Shield size={48} className="text-gray-300 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-[#4B2D8E] mb-2">SIGN IN REQUIRED</h1>
          <p className="text-gray-500 font-body mb-6">Please sign in to verify your ID.</p>
          <Link href="/account/login" className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full">SIGN IN</Link>
        </section>
      </>
    );
  }

  if (user.idVerified) {
    return (
      <>
        <SEOHead title="ID Verification" description="Your ID has been verified." noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Account', href: '/account' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </motion.div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">ID VERIFIED</h1>
            <p className="text-gray-600 font-body mb-6">Your identity has been verified. You can now place orders.</p>
            <Link href="/shop" className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full">START SHOPPING</Link>
          </div>
        </section>
      </>
    );
  }

  if (user.idVerificationStatus === 'pending') {
    return (
      <>
        <SEOHead title="ID Verification — Pending" description="Your ID verification is being reviewed." noindex />
        <section className="container py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Account', href: '/account' }, { label: 'ID Verification' }]} />
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <Clock size={40} className="text-yellow-600" />
            </div>
            <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">VERIFICATION PENDING</h1>
            <p className="text-gray-600 font-body mb-2">Your ID is currently being reviewed. This usually takes 1-2 hours.</p>
            <p className="text-sm text-gray-400 font-body mb-6">We'll notify you by email once your verification is complete.</p>
            <div className="bg-[#F5F5F5] rounded-xl p-4 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle size={16} className="text-green-600" /></div>
                <p className="text-sm font-body text-[#333]">Documents uploaded</p>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center"><Clock size={16} className="text-yellow-600" /></div>
                <p className="text-sm font-body text-[#333]">Under review</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Shield size={16} className="text-gray-400" /></div>
                <p className="text-sm font-body text-gray-400">Verification complete</p>
              </div>
            </div>
            <Link href="/account" className="text-[#4B2D8E] font-display text-sm hover:text-[#F15929] mt-6 inline-block">← BACK TO ACCOUNT</Link>
          </div>
        </section>
      </>
    );
  }

  const handleSubmit = async () => {
    if (!frontFile) { toast.error('Please upload a photo of your government-issued ID'); return; }
    // Check file size (16MB limit for backend)
    if (frontFile.size > 16 * 1024 * 1024) { toast.error('Front ID image must be under 16MB'); return; }
    if (selfieFile && selfieFile.size > 16 * 1024 * 1024) { toast.error('Selfie image must be under 16MB'); return; }
    setSubmitting(true);
    const result = await submitIdVerification(frontFile, selfieFile);
    setSubmitting(false);
    if (result === true) {
      toast.success('ID submitted for verification!');
    } else {
      toast.error(result);
    }
  };

  return (
    <>
      <SEOHead title="Verify Your ID" description="Upload your government-issued ID to verify your age (19+) and start ordering." noindex />
      <section className="container py-6 md:py-10">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Account', href: '/account' }, { label: 'Verify ID' }]} />
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl text-[#4B2D8E] mb-2">VERIFY YOUR ID</h1>
          <p className="text-gray-600 font-body mb-6">Canadian law requires you to be 19 years or older to purchase cannabis. Please upload a valid government-issued photo ID.</p>

          <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-4 mb-6">
            <h3 className="font-display text-sm text-[#4B2D8E] mb-2">ACCEPTED ID TYPES</h3>
            <ul className="text-sm font-body text-gray-600 space-y-1">
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Canadian Driver's License</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Canadian Passport</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Provincial Health Card (with photo)</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Canadian Citizenship Card</li>
            </ul>
          </div>

          {/* Upload areas */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="font-display text-sm text-[#4B2D8E] mb-2 block">GOVERNMENT-ISSUED ID (FRONT) *</label>
              <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${frontFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#4B2D8E] bg-[#F5F5F5]'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => setFrontFile(e.target.files?.[0] || null)} />
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
                    <p className="font-display text-sm text-gray-500">TAP TO UPLOAD ID PHOTO</p>
                    <p className="text-xs text-gray-400 font-body mt-1">JPG, PNG — Max 10MB</p>
                  </>
                )}
              </label>
            </div>

            <div>
              <label className="font-display text-sm text-[#4B2D8E] mb-2 block">SELFIE WITH ID (OPTIONAL)</label>
              <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${selfieFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#4B2D8E] bg-[#F5F5F5]'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
                {selfieFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle size={24} className="text-green-500" />
                    <div>
                      <p className="font-display text-sm text-green-700">{selfieFile.name}</p>
                      <p className="text-xs text-green-600 font-body">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera size={32} className="text-gray-400 mx-auto mb-2" />
                    <p className="font-display text-sm text-gray-500">TAP TO UPLOAD SELFIE</p>
                    <p className="text-xs text-gray-400 font-body mt-1">Hold your ID next to your face</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
            <h3 className="font-display text-xs text-gray-500 mb-2">PRIVACY NOTICE</h3>
            <p className="text-xs text-gray-500 font-body">Your ID documents are securely transmitted and stored. We only use them to verify your age. Documents are deleted after verification is complete. See our <Link href="/privacy-policy" className="text-[#4B2D8E] hover:underline">Privacy Policy</Link> for details.</p>
          </div>

          <button onClick={handleSubmit} disabled={!frontFile || submitting}
            className={`w-full font-display py-3.5 rounded-full transition-all flex items-center justify-center gap-2 ${frontFile && !submitting ? 'bg-[#F15929] hover:bg-[#d94d22] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {submitting ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> SUBMITTING...</>
            ) : (
              <><Upload size={18} /> SUBMIT FOR VERIFICATION</>
            )}
          </button>
        </div>
      </section>
    </>
  );
}
