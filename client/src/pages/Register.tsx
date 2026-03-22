import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Mail, Phone, User, Calendar, ArrowRight, ArrowLeft, Loader2, Shield, AlertCircle, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png';

type Step = 'info' | 'verify' | 'otp';

export default function Register() {
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

  useEffect(() => {
    fetch('/api/auth/sms-available').then(r => r.json()).then(d => setSmsAvailable(d.available)).catch(() => {});
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
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      toast.success('Account created! You earned 25 welcome bonus points! 🎉');
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
        title="Create Account — My Legacy Cannabis"
        description="Create your My Legacy Cannabis account to earn rewards, track orders, and get exclusive deals."
        canonical="https://mylegacycannabisca-production.up.railway.app/register"
      />

      <div className="min-h-screen bg-gradient-to-br from-[#4B2D8E] via-[#3a2270] to-[#2a1855] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/">
              <img src={LOGO_URL} alt="My Legacy Cannabis" className="h-14 mx-auto mb-4" />
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
