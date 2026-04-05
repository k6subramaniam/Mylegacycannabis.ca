import { useState, useEffect } from 'react';
import { Link, useSearch } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { ROUTE_SEO, canonical } from '@/lib/seo-config';
import { Mail, Phone, User, Calendar, ArrowRight, ArrowLeft, Loader2, Shield, AlertCircle, Gift, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';

type Step = 'info' | 'verify' | 'otp';

export default function Register() {
  const { logoUrl } = useSiteConfig();
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'sms'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);

  // Auto-populate referral code from URL query param ?ref=MLC-XXXX
  const searchString = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setShowReferral(true);
    }
  }, [searchString]);

  useEffect(() => {
    fetch('/api/auth/sms-available').then(r => r.json()).then(d => setSmsAvailable(d.available)).catch(() => {});
    fetch('/api/auth/google-available').then(r => r.json()).then(d => setGoogleAvailable(d.available)).catch(() => {});
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const isAtLeast19 = (dob: string): boolean => {
    if (!dob) return false;
    // Parse date parts directly to avoid timezone ambiguity (YYYY-MM-DD)
    const parts = dob.split('-');
    if (parts.length !== 3) return false;
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    const birthDay = parseInt(parts[2], 10);
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return false;

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth(); // 0-indexed
    const todayDay = today.getDate();

    let age = todayYear - birthYear;
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
      age--;
    }
    return age >= 19;
  };

  const validateInfo = () => {
    if (!name.trim()) { setError('Please enter your full name'); return false; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return false; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) { setError('Please enter a valid 10-digit phone number'); return false; }
    if (!birthday) { setError('Date of birth is required. You must be 19 or older to create an account.'); return false; }
    if (!isAtLeast19(birthday)) { setError('You must be 19 years of age or older to create an account.'); return false; }
    return true;
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const identifier = verifyMethod === 'email' ? email.trim() : phone.trim();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          type: verifyMethod,
          purpose: 'register',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send code');
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

  const handleVerifyAndRegister = async () => {
    if (otpCode.length !== 6) { setError('Please enter the 6-digit code'); return; }

    // Final client-side age guard (belt-and-suspenders before server check)
    if (!birthday) { setError('Date of birth is required. You must be 19 or older to create an account.'); return; }
    if (!isAtLeast19(birthday)) { setError('You must be 19 years of age or older to create an account.'); return; }

    setLoading(true);
    setError('');

    try {
      const identifier = verifyMethod === 'email' ? email.trim() : phone.trim();
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          code: otpCode,
          type: verifyMethod,
          purpose: 'register',
          registrationData: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            birthday: birthday || undefined,
            referralCode: referralCode.trim() || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      const bonusMsg = referralCode.trim()
        ? 'Account created! You earned 25 welcome points + 25 referral bonus points! 🎉'
        : 'Account created! You earned 25 welcome bonus points! 🎉';
      toast.success(bonusMsg);
      window.location.href = '/account';
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title={ROUTE_SEO['/register'].title}
        description={ROUTE_SEO['/register'].description}
        canonical={canonical('/register')}
        noindex
      />

      <div className="min-h-screen bg-gradient-to-br from-[#4B2D8E] via-[#3a2270] to-[#2a1855] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/">
              <img src={logoUrl || '/logo.webp'} alt="My Legacy Cannabis" className="h-14 mx-auto mb-4" />
            </Link>
            <h1 className="font-display text-2xl text-white">CREATE ACCOUNT</h1>
            <p className="text-white/60 font-body text-sm mt-1">Join My Legacy Rewards — earn points on every purchase</p>
          </div>

          {/* Welcome Bonus Banner */}
          <div className="bg-[#F15929] rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Gift size={18} className="text-white" />
            </div>
            <div>
              <p className="font-display text-xs text-white">GET 25 BONUS POINTS!</p>
              <p className="text-white/80 text-xs font-body">Earn 25 reward points just for creating your account</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-body">{error}
                  {error.includes('already exists') && (
                    <Link href="/login" className="text-[#4B2D8E] font-semibold underline ml-1">Sign In</Link>
                  )}
                </p>
              </div>
            )}

            {/* STEP 1: Personal Info */}
            {step === 'info' && (
              <div className="space-y-4">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200" />
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200" />
                </div>

                <p className="text-sm text-gray-600 font-body text-center">Step 1 of 3 — Your Information</p>

                {/* Name */}
                <div>
                  <label className="block text-xs font-display text-[#333] mb-1.5">FULL NAME *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(''); }}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none font-body text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-display text-[#333] mb-1.5">EMAIL ADDRESS *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none font-body text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Phone (Mandatory) */}
                <div>
                  <label className="block text-xs font-display text-[#333] mb-1.5">MOBILE NUMBER * <span className="text-[#F15929] font-body">(required)</span></label>
                  <div className="flex gap-2">
                    <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 font-mono text-sm text-gray-600 flex items-center">
                      +1
                    </div>
                    <div className="relative flex-1">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(''); }}
                        placeholder="(416) 555-0123"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#F15929] focus:ring-2 focus:ring-[#F15929]/20 outline-none font-body text-sm transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-body mt-1">Used for account verification and order updates</p>
                </div>

                {/* Referral Code (Optional) */}
                <div>
                  {!showReferral ? (
                    <button
                      type="button"
                      onClick={() => setShowReferral(true)}
                      className="flex items-center gap-1.5 text-xs font-display text-[#F15929] hover:text-[#d94d22] transition-colors"
                    >
                      <Users size={14} />
                      Have a referral code?
                    </button>
                  ) : (
                    <>
                      <label className="block text-xs font-display text-[#333] mb-1.5">REFERRAL CODE <span className="text-gray-400 font-body normal-case font-normal">(optional)</span></label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={referralCode}
                          onChange={e => { setReferralCode(e.target.value.toUpperCase()); setError(''); }}
                          placeholder="MLC-XXXXXX"
                          maxLength={20}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#F15929] focus:ring-2 focus:ring-[#F15929]/20 outline-none font-mono text-sm transition-all uppercase tracking-wide"
                        />
                      </div>
                      <p className="text-xs text-gray-400 font-body mt-1">You and your friend both earn bonus points!</p>
                    </>
                  )}
                </div>

                {/* Birthday (Required — age gate) */}
                <div>
                  <label className="block text-xs font-display text-[#333] mb-1.5">
                    DATE OF BIRTH * <span className="text-[#F15929] font-body normal-case font-normal">(must be 19+)</span>
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={birthday}
                      max={(() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() - 19);
                        return d.toISOString().split('T')[0];
                      })()}
                      min="1900-01-01"
                      onChange={e => { setBirthday(e.target.value); setError(''); }}
                      onBlur={e => {
                        const val = e.target.value;
                        if (val && !isAtLeast19(val)) {
                          setError('You must be 19 years of age or older to create an account.');
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none font-body text-sm transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-body mt-1">You must be 19 years of age or older to purchase cannabis in Ontario</p>
                </div>

                <button
                  onClick={() => {
                    if (validateInfo()) {
                      setStep('verify');
                      setError('');
                    }
                  }}
                  className="w-full py-3.5 rounded-full font-display text-sm text-white bg-[#4B2D8E] hover:bg-[#3a2270] transition-all flex items-center justify-center gap-2"
                >
                  CONTINUE <ArrowRight size={16} />
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-body">Already have an account?</span></div>
                </div>

                <Link href="/login" className="block w-full text-center border-2 border-[#4B2D8E] text-[#4B2D8E] hover:bg-[#4B2D8E] hover:text-white font-display text-sm py-3 rounded-full transition-all">
                  SIGN IN
                </Link>

                {/* Google Quick-Register */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-body">Or sign up quickly with</span></div>
                </div>

                <button
                  onClick={() => { window.location.href = '/api/auth/google'; }}
                  disabled={!googleAvailable}
                  className="w-full flex items-center justify-center gap-3 p-3.5 rounded-full border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-display text-sm text-[#333]">
                    {googleAvailable ? 'SIGN UP WITH GOOGLE' : 'GOOGLE SIGN-UP COMING SOON'}
                  </span>
                </button>
              </div>
            )}

            {/* STEP 2: Choose Verification Method */}
            {step === 'verify' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200" />
                </div>

                <button onClick={() => { setStep('info'); setError(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4B2D8E] font-body transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center mb-2">
                  <h2 className="font-display text-lg text-[#333]">VERIFY YOUR IDENTITY</h2>
                  <p className="text-xs text-gray-500 font-body mt-1">Choose how to receive your 6-digit verification code</p>
                </div>

                {/* Summary */}
                <div className="bg-[#F5F5F5] rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-body">
                    <Check size={14} className="text-green-500" />
                    <span className="text-gray-600">{name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-body">
                    <Check size={14} className="text-green-500" />
                    <span className="text-gray-600">{email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-body">
                    <Check size={14} className="text-green-500" />
                    <span className="text-gray-600">+1 {phone}</span>
                  </div>
                  {referralCode && (
                    <div className="flex items-center gap-2 text-sm font-body">
                      <Check size={14} className="text-green-500" />
                      <span className="text-gray-600">Referral: <span className="font-mono text-[#F15929]">{referralCode}</span></span>
                    </div>
                  )}
                </div>

                {/* Email Verification */}
                <button
                  onClick={() => { setVerifyMethod('email'); handleSendOTP(); }}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#4B2D8E] hover:bg-purple-50 transition-all group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center">
                    <Mail size={20} className="text-[#4B2D8E]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-display text-sm text-[#333]">VERIFY VIA EMAIL</p>
                    <p className="text-xs text-gray-500 font-body">Send code to {email}</p>
                  </div>
                  {loading && verifyMethod === 'email' ? <Loader2 size={16} className="animate-spin text-[#4B2D8E]" /> : <ArrowRight size={16} className="text-gray-400" />}
                </button>

                {/* SMS Verification */}
                <button
                  onClick={() => { setVerifyMethod('sms'); handleSendOTP(); }}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#F15929] hover:bg-orange-50 transition-all group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-[#F15929]/10 flex items-center justify-center">
                    <Phone size={20} className="text-[#F15929]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-display text-sm text-[#333]">VERIFY VIA SMS</p>
                    <p className="text-xs text-gray-500 font-body">
                      {smsAvailable ? `Text code to +1 ${phone}` : `SMS coming soon — code logged for testing`}
                    </p>
                  </div>
                  {loading && verifyMethod === 'sms' ? <Loader2 size={16} className="animate-spin text-[#F15929]" /> : <ArrowRight size={16} className="text-gray-400" />}
                </button>
              </div>
            )}

            {/* STEP 3: Enter OTP */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                  <div className="flex-1 h-1.5 rounded-full bg-[#4B2D8E]" />
                </div>

                <button onClick={() => { setStep('verify'); setOtpCode(''); setError(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4B2D8E] font-body transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
                    <Shield size={24} className="text-green-600" />
                  </div>
                  <h2 className="font-display text-lg text-[#333]">ENTER VERIFICATION CODE</h2>
                  <p className="text-xs text-gray-500 font-body mt-1">
                    Code sent to <strong className="text-[#333]">{verifyMethod === 'email' ? email : `+1 ${phone}`}</strong>
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
                          setOtpCode(prev => prev.slice(0, i) + prev.slice(i + 1));
                          return;
                        }
                        if (!val) return;
                        const newCode = otpCode.split('');
                        newCode[i] = val;
                        const joined = newCode.join('').slice(0, 6);
                        setOtpCode(joined);
                        setError('');
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
                        if (e.key === 'Enter' && otpCode.length === 6) handleVerifyAndRegister();
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        setOtpCode(pasted);
                        const target = (e.target as HTMLElement).parentElement?.children[Math.min(pasted.length, 5)] as HTMLInputElement;
                        target?.focus();
                      }}
                      className="w-12 h-14 text-center text-xl font-mono rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyAndRegister}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 rounded-full font-display text-sm text-white bg-[#F15929] hover:bg-[#d94d22] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                  CREATE ACCOUNT & EARN 25 POINTS
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-gray-400 font-body">Resend code in {countdown}s</p>
                  ) : (
                    <button onClick={handleSendOTP} className="text-xs text-[#4B2D8E] hover:underline font-body">
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
              By creating an account, you confirm you are 19 years of age or older and agree to our{' '}
              <a href="/terms" className="underline hover:text-white/70">Terms</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
