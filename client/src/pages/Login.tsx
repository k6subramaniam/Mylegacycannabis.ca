import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { ROUTE_SEO, canonical } from '@/lib/seo-config';
import { Mail, Phone, ArrowRight, ArrowLeft, Loader2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';

type AuthStep = 'method' | 'identifier' | 'otp';
type AuthMethod = 'email' | 'sms' | 'google';

export default function Login() {
  const [, navigate] = useLocation();
  const { logoUrl } = useSiteConfig();
  const [step, setStep] = useState<AuthStep>('method');
  const [method, setMethod] = useState<AuthMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [error, setError] = useState('');

  // Check available auth methods
  useEffect(() => {
    fetch('/api/auth/sms-available').then(r => r.json()).then(d => setSmsAvailable(d.available)).catch(() => {});
    fetch('/api/auth/google-available').then(r => r.json()).then(d => setGoogleAvailable(d.available)).catch(() => {});
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!identifier.trim()) {
      setError(method === 'email' ? 'Please enter your email address' : 'Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: method,
          purpose: 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send code');
        if (res.status === 404) {
          // User not found — suggest registration
          setError(data.error + ' ');
        }
        return;
      }

      if (data.fallback) {
        toast.info('SMS is being set up. Your code has been logged — contact support for your code during testing.');
      } else {
        toast.success(data.message || 'Verification code sent!');
      }

      setStep('otp');
      setCountdown(60);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: otpCode,
          type: method,
          purpose: 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      toast.success('Welcome back!');
      // Force full page reload to pick up session cookie
      window.location.href = '/account';
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  return (
    <>
      <SEOHead
        title={ROUTE_SEO['/login'].title}
        description={ROUTE_SEO['/login'].description}
        canonical={canonical('/login')}
        noindex
      />

      <div className="min-h-screen bg-gradient-to-br from-[#4B2D8E] via-[#3a2270] to-[#2a1855] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              <img src={logoUrl || '/logo.webp'} alt="My Legacy Cannabis" className="h-14 mx-auto mb-4" />
            </Link>
            <h1 className="font-display text-2xl text-white">SIGN IN</h1>
            <p className="text-white/60 font-body text-sm mt-1">Welcome back to My Legacy Cannabis</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-body">{error}
                  {error.includes('register first') && (
                    <Link href="/register" className="text-[#4B2D8E] font-semibold underline ml-1">Create Account</Link>
                  )}
                </p>
              </div>
            )}

            {/* STEP 1: Choose Method */}
            {step === 'method' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 font-body text-center mb-6">Choose how you'd like to sign in</p>

                {/* Email Login */}
                <button
                  onClick={() => { setMethod('email'); setStep('identifier'); setError(''); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#4B2D8E] hover:bg-purple-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center group-hover:bg-[#4B2D8E] transition-colors">
                    <Mail size={20} className="text-[#4B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="font-display text-sm text-[#333]">SIGN IN WITH EMAIL</p>
                    <p className="text-xs text-gray-500 font-body">We'll send a 6-digit code to your email</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:text-[#4B2D8E]" />
                </button>

                {/* SMS Login */}
                <button
                  onClick={() => { setMethod('sms'); setStep('identifier'); setError(''); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#4B2D8E] hover:bg-purple-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#F15929]/10 flex items-center justify-center group-hover:bg-[#F15929] transition-colors">
                    <Phone size={20} className="text-[#F15929] group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="font-display text-sm text-[#333]">SIGN IN WITH PHONE</p>
                    <p className="text-xs text-gray-500 font-body">
                      {smsAvailable ? "We'll text a 6-digit code to your phone" : "SMS coming soon — code logged for testing"}
                    </p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:text-[#F15929]" />
                </button>

                {/* Google Login */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={!googleAvailable}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-display text-sm text-[#333]">SIGN IN WITH GOOGLE</p>
                    <p className="text-xs text-gray-500 font-body">
                      {googleAvailable ? "Use your Google account" : "Google login coming soon"}
                    </p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400" />
                </button>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-body">New to My Legacy?</span></div>
                </div>

                <Link href="/register" className="block w-full text-center bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display text-sm py-3.5 rounded-full transition-all">
                  CREATE ACCOUNT
                </Link>
              </div>
            )}

            {/* STEP 2: Enter Identifier */}
            {step === 'identifier' && (
              <div className="space-y-4">
                <button onClick={() => { setStep('method'); setError(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4B2D8E] font-body transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center mb-2">
                  <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${method === 'email' ? 'bg-[#4B2D8E]/10' : 'bg-[#F15929]/10'}`}>
                    {method === 'email' ? <Mail size={24} className="text-[#4B2D8E]" /> : <Phone size={24} className="text-[#F15929]" />}
                  </div>
                  <h2 className="font-display text-lg text-[#333]">
                    {method === 'email' ? 'ENTER YOUR EMAIL' : 'ENTER YOUR PHONE'}
                  </h2>
                  <p className="text-xs text-gray-500 font-body mt-1">
                    {method === 'email' ? "We'll send a 6-digit verification code" : "We'll text you a 6-digit verification code"}
                  </p>
                </div>

                {method === 'email' ? (
                  <input
                    type="email"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none font-body text-sm transition-all"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  />
                ) : (
                  <div className="flex gap-2">
                    <div className="px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 font-mono text-sm text-gray-600 flex items-center">
                      +1
                    </div>
                    <input
                      type="tel"
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); setError(''); }}
                      placeholder="(416) 555-0123"
                      className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#F15929] focus:ring-2 focus:ring-[#F15929]/20 outline-none font-body text-sm transition-all"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>
                )}

                <button
                  onClick={handleSendOTP}
                  disabled={loading || !identifier.trim()}
                  className={`w-full py-3.5 rounded-full font-display text-sm text-white transition-all flex items-center justify-center gap-2 ${
                    method === 'email' ? 'bg-[#4B2D8E] hover:bg-[#3a2270]' : 'bg-[#F15929] hover:bg-[#d94d22]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  SEND VERIFICATION CODE
                </button>
              </div>
            )}

            {/* STEP 3: Enter OTP */}
            {step === 'otp' && (
              <div className="space-y-4">
                <button onClick={() => { setStep('identifier'); setOtpCode(''); setError(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4B2D8E] font-body transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
                    <Shield size={24} className="text-green-600" />
                  </div>
                  <h2 className="font-display text-lg text-[#333]">ENTER VERIFICATION CODE</h2>
                  <p className="text-xs text-gray-500 font-body mt-1">
                    Code sent to <strong className="text-[#333]">{identifier}</strong>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpCode[i] || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (!val && otpCode[i]) {
                          // Backspace
                          setOtpCode(prev => prev.slice(0, i) + prev.slice(i + 1));
                          return;
                        }
                        if (!val) return;
                        const newCode = otpCode.split('');
                        newCode[i] = val;
                        const joined = newCode.join('').slice(0, 6);
                        setOtpCode(joined);
                        setError('');
                        // Auto-focus next
                        if (val && i < 5) {
                          const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
                          const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                          prev?.focus();
                          setOtpCode(c => c.slice(0, i - 1) + c.slice(i));
                        }
                        if (e.key === 'Enter' && otpCode.length === 6) handleVerifyOTP();
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        setOtpCode(pasted);
                        // Focus last filled input
                        const target = (e.target as HTMLElement).parentElement?.children[Math.min(pasted.length, 5)] as HTMLInputElement;
                        target?.focus();
                      }}
                      className="w-12 h-14 text-center text-xl font-mono rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 rounded-full font-display text-sm text-white bg-[#4B2D8E] hover:bg-[#3a2270] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  VERIFY & SIGN IN
                </button>

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-gray-400 font-body">Resend code in {countdown}s</p>
                  ) : (
                    <button onClick={handleResend} className="text-xs text-[#4B2D8E] hover:underline font-body">
                      Didn't receive a code? Resend
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-white/40 text-xs font-body">
              By signing in, you confirm you are 19 years of age or older.
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <Link href="/privacy-policy" className="text-white/40 hover:text-white/60 text-xs font-body">Privacy Policy</Link>
              <Link href="/terms" className="text-white/40 hover:text-white/60 text-xs font-body">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
