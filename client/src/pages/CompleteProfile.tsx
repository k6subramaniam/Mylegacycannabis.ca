import { useState } from 'react';
import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { ROUTE_SEO, canonical } from '@/lib/seo-config';
import { Phone, Calendar, Loader2, AlertCircle, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useAuth } from '@/contexts/AuthContext';

function isAtLeast19(dob: string): boolean {
  if (!dob) return true; // optional field
  const parts = dob.split('-');
  if (parts.length !== 3) return true;
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return true;
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() < birthMonth || (today.getMonth() === birthMonth && today.getDate() < birthDay)) age--;
  return age >= 19;
}

function maxBirthdayDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 19);
  return d.toISOString().split('T')[0];
}

export default function CompleteProfile() {
  const { logoUrl } = useSiteConfig();
  const { isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const isWelcome = params.get('welcome') === 'true';

  // Wait for auth to resolve before rendering — the complete-profile POST
  // requires an active session cookie, which may not be hydrated yet after
  // the Google OAuth redirect.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4B2D8E] via-[#3a2270] to-[#2a1855]">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (birthday && !isAtLeast19(birthday)) {
      setError('You must be 19 years of age or older.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: phone.trim(),
          birthday: birthday || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      toast.success(isWelcome ? 'Account setup complete! You earned 25 welcome bonus points! 🎉' : 'Phone number added successfully!');
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
        title={ROUTE_SEO['/complete-profile'].title}
        description={ROUTE_SEO['/complete-profile'].description}
        canonical={canonical('/complete-profile')}
        noindex
      />

      <div className="min-h-screen bg-gradient-to-br from-[#4B2D8E] via-[#3a2270] to-[#2a1855] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link href="/">
              <img src={logoUrl || '/logo.webp'} alt="My Legacy Cannabis" className="h-14 mx-auto mb-4" />
            </Link>
            <h1 className="font-display text-2xl text-white">
              {isWelcome ? 'ALMOST THERE!' : 'COMPLETE PROFILE'}
            </h1>
            <p className="text-white/60 font-body text-sm mt-1">
              {isWelcome ? 'Add your phone number to finish setting up your account' : 'A phone number is required for your account'}
            </p>
          </div>

          {isWelcome && (
            <div className="bg-[#F15929] rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Gift size={18} className="text-white" />
              </div>
              <div>
                <p className="font-display text-xs text-white">WELCOME BONUS EARNED!</p>
                <p className="text-white/80 text-xs font-body">25 reward points have been added to your account</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-body">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <Check size={16} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-700 font-body">Google account connected successfully</p>
              </div>

              <div>
                <label className="block text-xs font-display text-[#333] mb-1.5">
                  MOBILE NUMBER * <span className="text-[#F15929] font-body">(required)</span>
                </label>
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
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 font-body mt-1">Used for account verification and order updates</p>
              </div>

              <div>
                <label className="block text-xs font-display text-[#333] mb-1.5">
                  BIRTHDAY <span className="text-gray-400 font-body">(optional — earn 100 bonus points!)</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={birthday}
                    max={maxBirthdayDate()}
                    min="1900-01-01"
                    onChange={e => { setBirthday(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none font-body text-sm transition-all"
                  />
                  {birthday && !isAtLeast19(birthday) && <p className="text-xs text-red-500 font-body mt-1">You must be 19 years of age or older.</p>}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !phone.trim()}
                className="w-full py-3.5 rounded-full font-display text-sm text-white bg-[#4B2D8E] hover:bg-[#3a2270] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                COMPLETE SETUP
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
