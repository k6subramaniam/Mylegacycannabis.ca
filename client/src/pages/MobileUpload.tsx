import { useState, useEffect } from 'react';
import SEOHead from '@/components/SEOHead';
import { Camera, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function MobileUpload() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'ready' | 'uploading' | 'success' | 'error' | 'expired'>('ready');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (!t) {
      setStatus('expired');
      return;
    }
    setToken(t);

    // Check if session is still valid
    fetch(`/api/verify/mobile-poll/${t}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'expired') setStatus('expired');
        else if (data.status === 'submitted') {
          setStatus('success');
          setSuccessMsg('Your ID has already been submitted. You can close this page.');
        }
      })
      .catch(() => setStatus('expired'));
  }, []);

  const handleFile = async (file: File) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Invalid file type. Please upload JPG, PNG, or WebP.');
      setStatus('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File too large. Maximum 10MB.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('id_document', file);
      formData.append('mobile_token', token);

      const res = await fetch('/api/verify/mobile-submit', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'ID submitted! You can close this page and return to your computer.');
        setStatus('success');
      } else {
        setErrorMsg(data.error || 'Upload failed.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <>
      <SEOHead title="Upload Your ID — My Legacy Cannabis" noindex />
      <div className="min-h-screen bg-[#f4f4f0]">
        {/* Header */}
        <div className="bg-[#4B2D8E] text-white text-center py-4 px-4">
          <h1 className="font-display text-lg tracking-wide">MY LEGACY CANNABIS</h1>
          <p className="text-xs text-white/70 font-body">ID Verification Upload</p>
        </div>

        <div className="p-5 max-w-md mx-auto">
          {status === 'expired' && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <h2 className="font-display text-lg text-[#4B2D8E] mb-2">SESSION EXPIRED</h2>
              <p className="text-sm font-body text-gray-500">This upload link has expired. Return to your computer and generate a new QR code.</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-display text-lg text-[#4B2D8E] mb-2">UPLOAD YOUR ID</h2>
              <p className="text-sm font-body text-gray-500 mb-5">Take a clear photo of your driver's licence, passport, or provincial ID card.</p>

              <label className="block w-full bg-[#4B2D8E] text-white font-display text-center py-4 rounded-xl mb-3 cursor-pointer active:scale-[0.98] transition-transform">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <Camera size={18} className="inline mr-2 -mt-0.5" /> Take Photo
              </label>

              <label className="block w-full bg-[#f0f0ec] text-[#333] font-display text-center py-4 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <FileText size={18} className="inline mr-2 -mt-0.5" /> Choose from Gallery
              </label>

              <div className="flex gap-2 justify-center mt-4">
                <span className="bg-[#f0f0ec] px-3 py-1 rounded text-xs font-display text-gray-400">JPG</span>
                <span className="bg-[#f0f0ec] px-3 py-1 rounded text-xs font-display text-gray-400">PNG</span>
                <span className="bg-[#f0f0ec] px-3 py-1 rounded text-xs font-display text-gray-400">WebP</span>
                <span className="bg-[#f0f0ec] px-3 py-1 rounded text-xs font-display text-gray-400">10MB max</span>
              </div>
              <p className="text-[10px] text-gray-400 font-body text-center mt-3">Your ID is stored securely and only reviewed by authorized staff.</p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-10 h-10 border-4 border-[#4B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="font-display text-lg text-[#4B2D8E] mb-2">UPLOADING...</h2>
              <p className="text-sm font-body text-gray-500">Keep this page open while your ID is being uploaded.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="font-display text-lg text-[#4B2D8E] mb-2">ID SUBMITTED!</h2>
              <p className="text-sm font-body text-gray-500">{successMsg}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <p className="text-sm font-body text-red-600 mb-4">{errorMsg}</p>
              <button onClick={() => setStatus('ready')} className="bg-[#4B2D8E] text-white font-display py-3 px-6 rounded-xl">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
