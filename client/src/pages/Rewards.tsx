import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { WaveDivider } from '@/components/Layout';
import { POINTS_PER_DOLLAR, WELCOME_BONUS, BIRTHDAY_BONUS, REVIEW_BONUS, REFERRAL_BONUS_REFERRER, REFERRAL_BONUS_REFEREE, MIN_REDEMPTION_POINTS, MAX_DISCOUNT_PERCENT } from '@/lib/data';
import { Gift, Star, Users, Calendar, MessageSquare, ShoppingCart, ArrowRight, Zap } from 'lucide-react';
import { useT } from '@/i18n';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-rewards-3eSuXoWLdHAW3VzjYxZwXX.webp';

export default function Rewards() {
  const { t } = useT();
  return (
    <>
      <SEOHead
        title="My Legacy Rewards — Loyalty Program"
        description="Earn 1 point for every $1 spent at My Legacy Cannabis. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up. Birthday bonuses, referral rewards, and more."
        canonical="https://mylegacycannabisca-production.up.railway.app/rewards"
        ogImage={HERO_IMG}
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="My Legacy Rewards loyalty program" className="w-full h-full object-cover opacity-30" loading="eager" width="1440" height="400" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-8 md:py-14">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#F15929] text-white font-display text-xs px-4 py-1.5 rounded-full mb-4">{t.rewardsPage.loyaltyProgram}</span>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-4">
              {t.rewardsPage.myLegacyRewards}<br /><span className="text-[#F15929]">{t.rewardsPage.rewards}</span>
            </h1>
            <p className="text-white/80 text-lg font-body mb-8 max-w-lg">
              {t.rewardsPage.heroDesc}
            </p>
            <Link href="/account/register" className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3.5 px-8 rounded-full transition-all hover:scale-105">
              {t.rewardsPage.joinNowGet.replace('{points}', String(WELCOME_BONUS))} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* How it works */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">{t.rewardsPage.howItWorks}</h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">{t.rewardsPage.howItWorksDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Users, title: t.rewardsPage.step1, desc: t.rewardsPage.step1Desc },
              { step: '02', icon: ShoppingCart, title: t.rewardsPage.step2, desc: t.rewardsPage.step2Desc.replace('{ptsPerDollar}', String(POINTS_PER_DOLLAR)) },
              { step: '03', icon: Gift, title: t.rewardsPage.step3, desc: t.rewardsPage.step3Desc },
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
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">{t.rewardsPage.waysToEarn}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: ShoppingCart, label: t.rewardsPage.everyPurchase, points: `${POINTS_PER_DOLLAR} pt / $1`, desc: t.rewardsPage.everyPurchaseDesc },
              { icon: Zap, label: t.rewardsPage.welcomeBonus, points: `${WELCOME_BONUS} ${t.common.pts}`, desc: t.rewardsPage.welcomeBonusDesc },
              { icon: Calendar, label: t.rewardsPage.birthdayBonus, points: `${BIRTHDAY_BONUS} ${t.common.pts}`, desc: t.rewardsPage.birthdayBonusDesc },
              { icon: MessageSquare, label: t.rewardsPage.productReview, points: `${REVIEW_BONUS} ${t.common.pts}`, desc: t.rewardsPage.productReviewDesc },
              { icon: Users, label: t.rewardsPage.referFriend, points: `${REFERRAL_BONUS_REFERRER} ${t.common.pts}`, desc: t.rewardsPage.referFriendDesc.replace('{referrer}', String(REFERRAL_BONUS_REFERRER)).replace('{referee}', String(REFERRAL_BONUS_REFEREE)) },
              { icon: Star, label: t.rewardsPage.specialPromos, points: t.rewardsPage.varies, desc: t.rewardsPage.specialPromosDesc },
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

      {/* Program Details */}
      <section className="bg-white py-12 md:py-16">
        <div className="container max-w-3xl">
          <div>
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-6 text-center">{t.rewardsPage.programDetails}</h2>
            <div className="space-y-4">
              {[
                { q: 'How do I earn points?', a: `You earn ${POINTS_PER_DOLLAR} point for every $1 spent (pre-tax, pre-shipping). Points are awarded once your order is marked as completed.` },
                { q: 'How do I redeem my points?', a: `You need at least ${MIN_REDEMPTION_POINTS} points to redeem. At checkout, choose how many points to apply — your discount is calculated automatically.` },
                { q: 'Is there a maximum discount?', a: `Yes, rewards cannot exceed ${MAX_DISCOUNT_PERCENT}% of your order subtotal. For example, on a $50 order, the max discount is $25.` },
                { q: 'Can I combine rewards with other offers?', a: 'Yes! Rewards can be stacked with other promotions and discount codes.' },
                { q: 'Do points expire?', a: 'No, your points never expire as long as your account remains active.' },
                { q: 'What happens if I return an order?', a: 'Points earned from returned or cancelled items will be deducted from your balance.' },
                { q: 'How does the referral program work?', a: `Share your unique referral code with friends. When they make their first purchase, you earn ${REFERRAL_BONUS_REFERRER} points and they earn ${REFERRAL_BONUS_REFEREE} points.` },
                { q: 'What bonuses can I earn?', a: `Sign-up bonus: ${WELCOME_BONUS} pts. Birthday bonus: ${BIRTHDAY_BONUS} pts. Product review: ${REVIEW_BONUS} pts. Plus seasonal and special promotions.` },
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
          <h2 className="font-display text-3xl text-white mb-4">{t.rewardsPage.startEarningToday}</h2>
          <p className="text-white/80 font-body mb-6 max-w-lg mx-auto">{t.rewardsPage.startEarningDesc.replace('{points}', String(WELCOME_BONUS))}</p>
          <Link href="/account/register" className="inline-flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3.5 px-8 rounded-full transition-all hover:scale-105">
            {t.rewardsPage.createFreeAccount} <ArrowRight size={18} />
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
