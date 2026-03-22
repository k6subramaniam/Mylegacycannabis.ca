import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { WaveDivider } from '@/components/Layout';
import { rewardTiers, POINTS_PER_DOLLAR, WELCOME_BONUS, BIRTHDAY_BONUS, REVIEW_BONUS, REFERRAL_BONUS_REFERRER, REFERRAL_BONUS_REFEREE, MIN_REDEMPTION_POINTS, MAX_DISCOUNT_PERCENT } from '@/lib/data';
import { Gift, Star, Users, Calendar, MessageSquare, ShoppingCart, ArrowRight, CheckCircle, Zap } from 'lucide-react';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-rewards-3eSuXoWLdHAW3VzjYxZwXX.webp';

export default function Rewards() {
  return (
    <>
      <SEOHead
        title="My Legacy Rewards — Loyalty Program"
        description="Earn 1 point for every $1 spent at My Legacy Cannabis. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up. Birthday bonuses, referral rewards, and more."
        canonical="https://mylegacycannabisca-production.up.railway.app/rewards"
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="My Legacy Rewards loyalty program" className="w-full h-full object-cover opacity-30" loading="eager" width="1440" height="400" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-8 md:py-14">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#F15929] text-white font-display text-xs px-4 py-1.5 rounded-full mb-4">LOYALTY PROGRAM</span>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-4">
              MY LEGACY<br /><span className="text-[#F15929]">REWARDS</span>
            </h1>
            <p className="text-white/80 text-lg font-body mb-8 max-w-lg">
              Earn points on every purchase. Redeem for discounts. Get rewarded for being a loyal customer.
            </p>
            <Link href="/account/register" className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3.5 px-8 rounded-full transition-all hover:scale-105">
              JOIN NOW — GET {WELCOME_BONUS} POINTS FREE <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* How it works */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">HOW IT WORKS</h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">Three simple steps to start earning rewards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Users, title: 'SIGN UP', desc: 'Create a free account and get 25 bonus points instantly. Enrollment is automatic.' },
              { step: '02', icon: ShoppingCart, title: 'EARN POINTS', desc: `Earn ${POINTS_PER_DOLLAR} point for every $1 spent. Plus bonus points for reviews, referrals, and birthdays.` },
              { step: '03', icon: Gift, title: 'REDEEM REWARDS', desc: 'Use your points for discounts up to $150 OFF. Redeem at checkout with a single click.' },
            ].map((item, i) => (
              <div key={i} className="bg-[#F5F5F5] rounded-2xl p-6 text-center relative overflow-hidden">
                <span className="absolute top-4 right-4 font-display text-5xl text-[#4B2D8E]/10">{item.step}</span>
                <div className="w-14 h-14 rounded-full bg-[#4B2D8E] flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} className="text-white" />
                </div>
                <h3 className="font-display text-lg text-[#4B2D8E] mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 font-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earning Structure */}
      <section className="bg-[#F5F5F5] py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">WAYS TO EARN</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: ShoppingCart, label: 'Every Purchase', points: `${POINTS_PER_DOLLAR} pt / $1`, desc: 'Earn on every order (pre-tax, pre-shipping)' },
              { icon: Zap, label: 'Welcome Bonus', points: `${WELCOME_BONUS} pts`, desc: 'Just for creating an account' },
              { icon: Calendar, label: 'Birthday Bonus', points: `${BIRTHDAY_BONUS} pts`, desc: 'Happy birthday from us to you!' },
              { icon: MessageSquare, label: 'Product Review', points: `${REVIEW_BONUS} pts`, desc: 'Per approved review' },
              { icon: Users, label: 'Refer a Friend', points: `${REFERRAL_BONUS_REFERRER} pts`, desc: `You get ${REFERRAL_BONUS_REFERRER}, friend gets ${REFERRAL_BONUS_REFEREE}` },
              { icon: Star, label: 'Special Promos', points: 'Varies', desc: 'Bonus point events throughout the year' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-[#4B2D8E]" />
                </div>
                <div>
                  <p className="font-display text-sm text-[#4B2D8E]">{item.label}</p>
                  <p className="font-display text-lg text-[#F15929]">{item.points}</p>
                  <p className="text-xs text-gray-500 font-body">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider color="#4B2D8E" />

      {/* Redemption Tiers */}
      <section className="bg-[#4B2D8E] py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-white mb-3">REDEMPTION TIERS</h2>
            <p className="text-white/70 font-body max-w-lg mx-auto">The more points you accumulate, the bigger the discount.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {rewardTiers.map((tier, i) => (
              <div key={tier.name} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/10 hover:border-[#F15929]/50 transition-all">
                <p className="font-display text-xs text-white/60 mb-1">{tier.target}</p>
                <p className="font-display text-lg text-[#F15929]">{tier.name.toUpperCase()}</p>
                <p className="font-display text-3xl text-white my-2">${tier.discount}</p>
                <p className="text-sm text-white/70 font-body">OFF</p>
                <div className="border-t border-white/10 mt-3 pt-3">
                  <p className="font-mono-legacy text-sm text-white">{tier.pointsRequired} pts</p>
                  <p className="text-xs text-white/50 font-body">{tier.effectiveValue} value</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider color="#ffffff" />

      {/* Policies */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container max-w-3xl">
          <div>
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-6 text-center">PROGRAM DETAILS</h2>
            <div className="space-y-4">
              {[
                { q: 'When do I earn points?', a: 'Points are awarded when your order is marked as completed. Points are calculated on the pre-tax, pre-shipping order total.' },
                { q: 'What is the minimum redemption?', a: `You need at least ${MIN_REDEMPTION_POINTS} points to redeem. The minimum redemption is ${MIN_REDEMPTION_POINTS} points = $5 OFF.` },
                { q: 'Is there a maximum discount?', a: `Yes, rewards cannot exceed ${MAX_DISCOUNT_PERCENT}% of your order subtotal. For example, on a $50 order, the max discount is $25.` },
                { q: 'Can I combine rewards with other offers?', a: 'Yes! Rewards can be combined with other promotions and discounts.' },
                { q: 'Do points expire?', a: 'No, points never expire as long as your account remains active.' },
                { q: 'What happens if I return an order?', a: 'Points earned from returned items will be deducted from your balance.' },
                { q: 'How does the referral program work?', a: `Share your unique referral code with friends. When they make their first purchase, you earn ${REFERRAL_BONUS_REFERRER} points and they earn ${REFERRAL_BONUS_REFEREE} points.` },
              ].map((item, i) => (
                <div key={i} className="bg-[#F5F5F5] rounded-xl p-5">
                  <h3 className="font-display text-sm text-[#4B2D8E] mb-2">{item.q}</h3>
                  <p className="text-sm text-gray-600 font-body">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F15929] py-12">
        <div className="container text-center">
          <h2 className="font-display text-3xl text-white mb-4">START EARNING TODAY</h2>
          <p className="text-white/80 font-body mb-6 max-w-lg mx-auto">Create your free account and get {WELCOME_BONUS} bonus points instantly. It's free to join!</p>
          <Link href="/account/register" className="inline-flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3.5 px-8 rounded-full transition-all hover:scale-105">
            CREATE FREE ACCOUNT <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage", "name": "My Legacy Rewards — Loyalty Program",
        "description": "Earn points on every purchase at My Legacy Cannabis. Redeem for discounts up to $150 OFF.",
        "url": "https://mylegacycannabisca-production.up.railway.app/rewards"
      })}} />
    </>
  );
}
