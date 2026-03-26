import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { rewardTiers, getEligibleRewardTiers, REFERRAL_BONUS_REFERRER } from '@/lib/data';
import { User, Package, Gift, Shield, LogOut, Copy, Star, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';

export default function Account() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { idVerificationEnabled } = useSiteConfig();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (location.includes('/login') || location.includes('/register')) return;
    if (location.includes('/rewards')) setActiveTab('rewards');
    else if (location.includes('/orders')) setActiveTab('orders');
    else setActiveTab('profile');
  }, [location]);

  // Redirect unauthenticated users to the real OTP-capable login/register pages
  useEffect(() => {
    if (!isAuthenticated || !user) {
      const isRegister = location.includes('/register');
      navigate(isRegister ? '/register' : '/login', { replace: true });
    }
  }, [isAuthenticated, user, location, navigate]);

  if (!isAuthenticated || !user) {
    return null; // will redirect above
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'rewards', label: 'My Rewards', icon: Gift },
  ];

  return (
    <>
      <SEOHead title="My Account" description="Manage your My Legacy Cannabis account, orders, and rewards." noindex />
      <section className="bg-white py-6 md:py-10">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Account' }]} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl text-[#4B2D8E]">MY ACCOUNT</h1>
            <button onClick={() => { logout(); navigate('/'); toast.info('Signed out'); }}
              className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-body">
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          {/* Welcome banner */}
          <div className="bg-[#4B2D8E] rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-white/70 font-body text-sm">Welcome back,</p>
              <p className="font-display text-xl text-white">{user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-display text-2xl text-[#F15929]">{user.rewardsPoints}</p>
                <p className="text-white/70 text-xs font-body">Points</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl text-white">{user.orders.length}</p>
                <p className="text-white/70 text-xs font-body">Orders</p>
              </div>
              {idVerificationEnabled && (
              <div className="text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.idVerified ? 'bg-green-500' : 'bg-orange-500'}`}>
                  <Shield size={16} className="text-white" />
                </div>
                <p className="text-white/70 text-[10px] font-body mt-1">{user.idVerified ? 'Verified' : 'Pending'}</p>
              </div>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-display text-xs whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#4B2D8E] text-white' : 'bg-[#F5F5F5] text-[#333] hover:bg-[#e8e8e8]'}`}>
                <tab.icon size={14} /> {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'orders' && <OrdersTab user={user} />}
          {activeTab === 'rewards' && <RewardsTab user={user} />}
        </div>
      </section>
    </>
  );
}


function ProfileTab({ user }: { user: any }) {
  const { idVerificationEnabled } = useSiteConfig();

  const disabledInputClass = 'w-full bg-gray-100 rounded-lg px-4 py-3 text-sm font-body text-gray-500 cursor-not-allowed';

  return (
    <div className="space-y-6">
      {/* Contact admin notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-body text-amber-800 font-medium">Profile details are locked after registration</p>
          <p className="text-xs font-body text-amber-700 mt-1">
            For security purposes, personal information cannot be changed by customers.
            If you need to update your details, please contact our support team.
          </p>
          <a href="mailto:support@mylegacycannabis.ca" className="inline-flex items-center gap-1.5 mt-2 text-xs font-display text-[#F15929] hover:underline">
            <Mail size={13} /> CONTACT SUPPORT
          </a>
        </div>
      </div>

      <div className="bg-[#F5F5F5] rounded-2xl p-6">
        <h2 className="font-display text-lg text-[#4B2D8E] mb-4">PERSONAL INFORMATION</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-body block mb-1">First Name</label>
            <input type="text" value={user.firstName || ''} disabled className={disabledInputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-body block mb-1">Last Name</label>
            <input type="text" value={user.lastName || ''} disabled className={disabledInputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-body block mb-1">Email</label>
            <input type="email" value={user.email || ''} disabled className={disabledInputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-body block mb-1">Phone</label>
            <input type="tel" value={user.phone || ''} disabled className={disabledInputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-body block mb-1">Birthday</label>
            <input type="text" value={user.birthday || 'Not set'} disabled className={disabledInputClass} />
          </div>
        </div>
      </div>

      {/* ID Verification Status — hidden when feature is disabled */}
      {idVerificationEnabled && (
      <div className="bg-[#F5F5F5] rounded-2xl p-6">
        <h2 className="font-display text-lg text-[#4B2D8E] mb-4">ID VERIFICATION</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.idVerified ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Shield size={18} className={user.idVerified ? 'text-green-600' : 'text-orange-600'} />
            </div>
            <div>
              <p className="font-display text-sm text-[#333]">{user.idVerified ? 'VERIFIED' : user.idVerificationStatus === 'pending' ? 'PENDING REVIEW' : 'NOT VERIFIED'}</p>
              <p className="text-xs text-gray-500 font-body">{user.idVerified ? 'Your ID has been verified.' : 'Verify your ID to place orders.'}</p>
            </div>
          </div>
          {!user.idVerified && (
            <Link href="/account/verify-id" className="bg-[#4B2D8E] text-white font-display text-xs py-2 px-4 rounded-full hover:bg-[#3a2270] transition-all">
              {user.idVerificationStatus === 'pending' ? 'CHECK STATUS' : 'VERIFY NOW'}
            </Link>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function OrdersTab({ user }: { user: any }) {
  if (user.orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="font-display text-lg text-gray-400 mb-2">NO ORDERS YET</p>
        <Link href="/shop" className="text-[#F15929] font-display text-sm hover:underline">START SHOPPING →</Link>
      </div>
    );
  }
  const statusColors: Record<string, string> = { pending: 'bg-orange-100 text-orange-700', processing: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', shipped: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
  return (
    <div className="space-y-4">
      {user.orders.map((order: any) => (
        <div key={order.id} className="bg-[#F5F5F5] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-display text-sm text-[#4B2D8E]">ORDER #{order.id}</p>
              <p className="text-xs text-gray-500 font-body">{new Date(order.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-display ${statusColors[order.status] || ''}`}>{order.status.toUpperCase()}</span>
          </div>
          <div className="space-y-2 mb-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm font-body">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-mono-legacy text-[#333]">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="font-display text-sm text-[#4B2D8E]">TOTAL: ${order.total.toFixed(2)}</span>
            {order.trackingNumber && <span className="text-xs text-gray-500 font-mono-legacy">Tracking: {order.trackingNumber}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RewardsTab({ user }: { user: any }) {
  const eligible = getEligibleRewardTiers(user.rewardsPoints);
  const nextTier = rewardTiers.find(t => t.pointsRequired > user.rewardsPoints);

  return (
    <div className="space-y-6">
      {/* Points balance */}
      <div className="bg-[#4B2D8E] rounded-2xl p-6 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#F15929]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <Gift size={32} className="text-[#F15929] mx-auto mb-2" />
        <p className="font-display text-4xl mb-1">{user.rewardsPoints}</p>
        <p className="text-white/70 font-body text-sm">Available Points</p>
        {nextTier && (
          <div className="mt-4">
            <p className="text-xs text-white/60 font-body">{nextTier.pointsRequired - user.rewardsPoints} points to {nextTier.name} ({nextTier.pointsRequired} pts = ${nextTier.discount} OFF)</p>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <div className="bg-[#F15929] h-2 rounded-full" style={{ width: `${(user.rewardsPoints / nextTier.pointsRequired) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Available rewards */}
      {eligible.length > 0 && (
        <div className="bg-[#F5F5F5] rounded-2xl p-6">
          <h3 className="font-display text-lg text-[#4B2D8E] mb-4">AVAILABLE REWARDS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eligible.map(tier => (
              <div key={tier.name} className="bg-white rounded-xl p-4 border-2 border-[#F15929]/20 hover:border-[#F15929] transition-all">
                <p className="font-display text-sm text-[#4B2D8E]">{tier.name.toUpperCase()}</p>
                <p className="font-display text-2xl text-[#F15929]">${tier.discount} OFF</p>
                <p className="text-xs text-gray-500 font-body">{tier.pointsRequired} points required</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral */}
      <div className="bg-[#F5F5F5] rounded-2xl p-6">
        <h3 className="font-display text-lg text-[#4B2D8E] mb-3">REFER A FRIEND</h3>
        <p className="text-sm text-gray-600 font-body mb-3">Share your referral code and earn {REFERRAL_BONUS_REFERRER} points when your friend makes their first purchase!</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-lg px-4 py-3 font-mono-legacy text-sm text-[#4B2D8E] font-medium">{user.referralCode}</div>
          <button onClick={() => { navigator.clipboard.writeText(user.referralCode); toast.success('Referral code copied!'); }}
            className="bg-[#F15929] text-white p-3 rounded-lg hover:bg-[#d94d22] transition-all" aria-label="Copy referral code">
            <Copy size={18} />
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-[#F5F5F5] rounded-2xl p-6">
        <h3 className="font-display text-lg text-[#4B2D8E] mb-4">POINTS HISTORY</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {user.rewardsHistory.map((entry: any) => (
            <div key={entry.id} className="flex items-center justify-between bg-white rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === 'earned' ? 'bg-green-100' : entry.type === 'redeemed' ? 'bg-red-100' : 'bg-[#4B2D8E]/10'}`}>
                  {entry.type === 'earned' ? <Star size={14} className="text-green-600" /> : entry.type === 'redeemed' ? <Gift size={14} className="text-red-600" /> : <Gift size={14} className="text-[#4B2D8E]" />}
                </div>
                <div>
                  <p className="text-xs font-body text-[#333]">{entry.description}</p>
                  <p className="text-[10px] text-gray-400 font-body">{new Date(entry.date).toLocaleDateString('en-CA')}</p>
                </div>
              </div>
              <span className={`font-mono-legacy text-sm font-medium ${entry.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {entry.points > 0 ? '+' : ''}{entry.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


