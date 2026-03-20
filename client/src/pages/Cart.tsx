import { Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { canadianProvinces, FREE_SHIPPING_THRESHOLD, MINIMUM_ORDER, getEligibleRewardTiers } from '@/lib/data';
import { trpc } from '@/lib/trpc';
import { Minus, Plus, Trash2, Truck, Gift, ShoppingCart, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useEffect } from 'react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, shippingRate, shippingProvince, setShippingProvince, total, isFreeShipping, freeShippingProgress, amountToFreeShipping, meetsMinimum, pointsToEarn, appliedReward, applyReward, rewardDiscount } = useCart();
  const { user } = useAuth();
  const eligibleTiers = user ? getEligibleRewardTiers(user.rewardsPoints) : [];
  const { data: shippingZones } = trpc.store.shippingZones.useQuery();

  if (items.length === 0) {
    return (
      <>
        <SEOHead title="Cart" description="Your shopping cart is empty." noindex />
        <section className="container py-20 text-center">
          <ShoppingCart size={64} className="text-gray-300 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-[#4B2D8E] mb-2">YOUR CART IS EMPTY</h1>
          <p className="text-gray-500 font-body mb-6">Looks like you haven't added anything yet.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 bg-[#F15929] text-white font-display py-3 px-8 rounded-full hover:bg-[#d94d22] transition-all">
            START SHOPPING <ArrowRight size={18} />
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Cart" description="Review your cart and proceed to checkout." noindex />
      <section className="bg-white py-6 md:py-10">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Cart' }]} />
          <h1 className="font-display text-2xl md:text-3xl text-[#4B2D8E] mb-6">YOUR CART</h1>

          {/* Free shipping progress */}
          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
            {isFreeShipping ? (
              <p className="text-sm font-body text-[#4B2D8E] flex items-center gap-2"><Truck size={16} className="text-[#F15929]" /> <strong>You qualify for FREE shipping!</strong></p>
            ) : (
              <>
                <p className="text-sm font-body text-[#333] mb-2">Add <strong className="text-[#F15929]">${amountToFreeShipping.toFixed(2)}</strong> more for <strong>FREE shipping</strong></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-[#F15929] h-2.5 rounded-full transition-all" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </>
            )}
          </div>

          {/* Rewards balance banner */}
          {user && (
            <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-body text-[#4B2D8E] flex items-center gap-2">
                <Gift size={16} className="text-[#F15929]" /> You have <strong>{user.rewardsPoints} points</strong> available
              </p>
              {eligibleTiers.length > 0 && !appliedReward && (
                <div className="flex gap-2 flex-wrap">
                  {eligibleTiers.map(tier => (
                    <button key={tier.name} onClick={() => { applyReward(tier); toast.success(`${tier.name} reward applied — $${tier.discount} OFF`); }}
                      className="bg-[#F15929] text-white font-display text-xs px-3 py-1.5 rounded-full hover:bg-[#d94d22] transition-all">
                      {tier.pointsRequired} PTS = ${tier.discount} OFF
                    </button>
                  ))}
                </div>
              )}
              {appliedReward && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-body text-[#F15929] font-medium">{appliedReward.name}: -${rewardDiscount.toFixed(2)}</span>
                  <button onClick={() => applyReward(null)} className="text-xs text-gray-500 hover:text-red-500 underline">Remove</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <motion.div key={item.product.id} layout className="bg-[#F5F5F5] rounded-xl p-4 flex gap-4">
                  <Link href={`/product/${item.product.slug}`} className="shrink-0">
                    <img src={item.product.image} alt={item.product.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl" loading="lazy" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/product/${item.product.slug}`}>
                          <h3 className="font-display text-sm text-[#4B2D8E] hover:text-[#F15929] transition-colors">{item.product.name.toUpperCase()}</h3>
                        </Link>
                        <p className="text-xs text-gray-500 font-body">{item.product.category} · {item.product.weight}</p>
                      </div>
                      <button onClick={() => { removeItem(item.product.id); toast.info(`${item.product.name} removed`); }}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors" aria-label={`Remove ${item.product.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-white rounded-full">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2 hover:text-[#F15929]" aria-label="Decrease"><Minus size={14} /></button>
                        <span className="w-8 text-center text-sm font-display">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2 hover:text-[#F15929]" aria-label="Increase"><Plus size={14} /></button>
                      </div>
                      <span className="font-display text-base text-[#4B2D8E]">${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#F5F5F5] rounded-2xl p-6 sticky top-28">
                <h2 className="font-display text-lg text-[#4B2D8E] mb-4">ORDER SUMMARY</h2>

                {/* Shipping province selector */}
                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-body block mb-1">Shipping to:</label>
                  <select value={shippingProvince} onChange={e => setShippingProvince(e.target.value)}
                    className="w-full bg-white rounded-lg px-3 py-2.5 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" aria-label="Select province">
                    {canadianProvinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 text-sm font-body border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-[#333]">${subtotal.toFixed(2)}</span></div>
                  {rewardDiscount > 0 && (
                    <div className="flex justify-between text-[#F15929]"><span>Rewards Discount</span><span>-${rewardDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className={isFreeShipping ? 'text-[#F15929] font-medium' : 'text-[#333]'}>{isFreeShipping ? 'FREE' : `$${shippingRate.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-[#333]">$0.00</span></div>
                </div>

                <div className="flex justify-between font-display text-lg mb-2">
                  <span className="text-[#4B2D8E]">TOTAL</span>
                  <span className="text-[#4B2D8E]">${total.toFixed(2)}</span>
                </div>

                <p className="text-xs text-[#4B2D8E] font-body mb-4 flex items-center gap-1">
                  <Gift size={12} className="text-[#F15929]" /> You'll earn <strong>{pointsToEarn} points</strong> with this order
                </p>

                {!meetsMinimum && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-body">Minimum order is ${MINIMUM_ORDER}. Add ${(MINIMUM_ORDER - subtotal).toFixed(2)} more to proceed.</p>
                  </div>
                )}

                {/* ID verification reminder */}
                <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-lg p-3 mb-4">
                  <p className="text-xs font-body text-[#4B2D8E] flex items-start gap-1.5">
                    <Shield size={14} className="shrink-0 mt-0.5" />
                    <span>{user?.idVerificationStatus === 'approved' ? <strong className="text-green-600">ID Verified ✓</strong> : 'ID verification required at checkout (19+)'}</span>
                  </p>
                </div>

                <Link href={meetsMinimum ? '/checkout' : '#'}
                  className={`block w-full text-center font-display py-3.5 rounded-full transition-all ${meetsMinimum ? 'bg-[#F15929] hover:bg-[#d94d22] text-white hover:scale-[1.02]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  PROCEED TO CHECKOUT
                </Link>

                <Link href="/shop" className="block text-center text-sm text-[#4B2D8E] hover:text-[#F15929] font-body mt-3 transition-colors">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
