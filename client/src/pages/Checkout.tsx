import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { canadianProvinces, FREE_SHIPPING_THRESHOLD, MINIMUM_ORDER } from '@/lib/data';
import { Lock, Gift, AlertCircle, CheckCircle, CreditCard, Shield, Camera, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSiteConfig } from '@/hooks/useSiteConfig';

/* ================================================================
   GUEST ID VERIFICATION INLINE COMPONENT
   Guests submit their ID — order is placed immediately but held
   until My Legacy reviews and approves the submission.
   ================================================================ */
function GuestIDVerification({ onSubmitted, guestEmail }: { onSubmitted: (verificationId: number) => void; guestEmail?: string }) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!frontFile) { toast.error('Please upload a photo of your government-issued ID'); return; }
    setSubmitting(true);
    try {
      // Convert to base64 and submit to the verify API
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const frontBase64 = await toBase64(frontFile);
      const selfieBase64 = selfieFile ? await toBase64(selfieFile) : undefined;

      const fd = new FormData();
      fd.append('id_document', frontFile);
      fd.append('email', guestEmail || `guest-${Date.now()}@checkout.mylegacycannabis.ca`);
      if (selfieFile) fd.append('selfieImage', selfieFile);

      const res = await fetch('/api/verify/submit', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      const verificationId = json.verificationId ?? 0;
      toast.success('ID submitted for review!');
      onSubmitted(verificationId);
    } catch (err) {
      // Fallback: call tRPC submitVerification if REST fails
      try {
        const toBase64Fallback = (file: File): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        const frontBase64Fb = await toBase64Fallback(frontFile);
        const trpcRes = await fetch('/api/trpc/store.submitVerification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: { frontImageBase64: frontBase64Fb, guestEmail: guestEmail || '', contentType: frontFile.type || 'image/jpeg' } }),
        });
        const trpcJson = await trpcRes.json();
        const vId = trpcJson?.result?.data?.json?.id ?? 0;
        toast.success('ID submitted for review!');
        onSubmitted(vId);
      } catch {
        toast.error('ID submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#4B2D8E] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg text-[#4B2D8E]">GUEST ID VERIFICATION</h2>
          <p className="text-xs text-gray-500 font-body">Required every checkout — you must be 19+</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
        <p className="text-xs font-body text-orange-700">
          <strong>Guest checkout requires ID verification each time.</strong> Create an account to verify once and skip this step on future orders.
        </p>
      </div>

      <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-3 mb-4">
        <p className="font-display text-xs text-[#4B2D8E] mb-1.5">ACCEPTED ID TYPES</p>
        <ul className="text-xs font-body text-gray-600 space-y-1">
          <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Canadian Driver's License</li>
          <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Canadian Passport</li>
          <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Provincial Health Card (with photo)</li>
          <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Canadian Citizenship Card</li>
        </ul>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="font-display text-xs text-[#4B2D8E] mb-1.5 block">GOVERNMENT-ISSUED ID (FRONT) *</label>
          <label className={`block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${frontFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#4B2D8E] bg-[#F5F5F5]'}`}>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFrontFile(e.target.files?.[0] || null)} />
            {frontFile ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                <div className="text-left">
                  <p className="font-display text-xs text-green-700">{frontFile.name}</p>
                  <p className="text-[10px] text-green-600 font-body">Tap to change</p>
                </div>
              </div>
            ) : (
              <>
                <FileText size={24} className="text-gray-400 mx-auto mb-1" />
                <p className="font-display text-xs text-gray-500">TAP TO UPLOAD ID PHOTO</p>
                <p className="text-[10px] text-gray-400 font-body mt-0.5">JPG, PNG — Max 10MB</p>
              </>
            )}
          </label>
        </div>

        <div>
          <label className="font-display text-xs text-[#4B2D8E] mb-1.5 block">SELFIE WITH ID (OPTIONAL)</label>
          <label className={`block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${selfieFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#4B2D8E] bg-[#F5F5F5]'}`}>
            <input type="file" accept="image/*" className="hidden" onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
            {selfieFile ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                <div className="text-left">
                  <p className="font-display text-xs text-green-700">{selfieFile.name}</p>
                  <p className="text-[10px] text-green-600 font-body">Tap to change</p>
                </div>
              </div>
            ) : (
              <>
                <Camera size={24} className="text-gray-400 mx-auto mb-1" />
                <p className="font-display text-xs text-gray-500">TAP TO UPLOAD SELFIE</p>
                <p className="text-[10px] text-gray-400 font-body mt-0.5">Hold your ID next to your face</p>
              </>
            )}
          </label>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!frontFile || submitting}
        className={`w-full font-display text-sm py-3 rounded-full transition-all flex items-center justify-center gap-2 ${frontFile && !submitting ? 'bg-[#4B2D8E] hover:bg-[#3a2270] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
        {submitting ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> SUBMITTING...</>
        ) : (
          <><Shield size={16} /> SUBMIT ID & CONTINUE</>
        )}
      </button>
    </div>
  );
}

/* ================================================================
   MAIN CHECKOUT PAGE
   ================================================================ */
export default function Checkout() {
  const { items, subtotal, shippingRate, shippingProvince, setShippingProvince, total, isFreeShipping, pointsToEarn, meetsMinimum, rewardDiscount, clearCart } = useCart();
  const { user, isAuthenticated, addOrder } = useAuth();
  const { idVerificationEnabled } = useSiteConfig();
  const [, navigate] = useLocation();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // guestIdSubmitted: guest has uploaded their ID (order allowed, held for review)
  const [guestIdSubmitted, setGuestIdSubmitted] = useState(false);
  const [guestVerificationId, setGuestVerificationId] = useState<number>(0);
  const submitOrder = trpc.store.submitOrder.useMutation();
  const [form, setForm] = useState({
    email: user?.email || '', firstName: user?.firstName || '', lastName: user?.lastName || '',
    phone: user?.phone || '', address: '', city: '', province: shippingProvince, postalCode: '', notes: '',
  });

  // When ID verification is disabled, everyone can place orders freely
  const idCheckRequired = idVerificationEnabled;
  // Registered + approved: full green pass (check both idVerified flag and idVerificationStatus)
  const isRegisteredAndVerified = isAuthenticated && user && (user.idVerified || user.idVerificationStatus === 'approved');
  // Registered + pending: allow order, hold for admin
  const isRegisteredPending = isAuthenticated && user && user.idVerificationStatus === 'pending';
  // Guest can place order once they've submitted ID for review
  const canPlaceOrder = !idCheckRequired || isRegisteredAndVerified || isRegisteredPending || guestIdSubmitted;
  // Whether the order will be held pending ID review
  const orderHeldForIdReview = idCheckRequired && (isRegisteredPending || (!isAuthenticated && guestIdSubmitted));

  if (!meetsMinimum && !orderPlaced) {
    return (
      <>
        <SEOHead title="Checkout" description="Complete your order." noindex />
        <section className="container py-20 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-[#4B2D8E] mb-2">MINIMUM ORDER NOT MET</h1>
          <p className="text-gray-500 font-body mb-6">The minimum order is ${MINIMUM_ORDER}. Please add more items.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 bg-[#F15929] text-white font-display py-3 px-8 rounded-full">CONTINUE SHOPPING</Link>
        </section>
      </>
    );
  }

  if (orderPlaced) {
    return (
      <>
        <SEOHead title="Order Confirmed" description="Your order has been placed successfully." noindex />
        <section className="container py-20 text-center max-w-lg mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </motion.div>
          <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">ORDER RECEIVED!</h1>
          <p className="text-gray-600 font-body mb-2">Order #{orderNumber}</p>

          {orderHeldForIdReview ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-left">
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-body text-yellow-800 font-semibold">Your order will be processed once your age is verified</p>
                  <p className="text-xs font-body text-yellow-700 mt-1">
                    Our team is reviewing your submitted ID. You'll receive a confirmation once approved and your e-Transfer payment is received.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 font-body text-sm mb-4">
              Thank you! Send your e-Transfer to complete your purchase.
            </p>
          )}

          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6 text-left">
            <h3 className="font-display text-sm text-[#4B2D8E] mb-2">E-TRANSFER DETAILS</h3>
            <p className="text-sm font-body text-gray-600">Email: <strong>payments@mylegacycannabis.ca</strong></p>
            <p className="text-sm font-body text-gray-600">Amount: <strong>${total.toFixed(2)}</strong></p>
            <p className="text-xs text-gray-400 font-body mt-2">Include your order number in the e-Transfer message.</p>
          </div>

          {isAuthenticated && (
            <div className="bg-[#4B2D8E]/5 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Gift size={18} className="text-[#F15929] shrink-0" />
              <p className="text-sm font-body text-[#4B2D8E]">You earned <strong>{pointsToEarn} points</strong> with this order!</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/shop" className="bg-[#F15929] text-white font-display py-3 px-8 rounded-full hover:bg-[#d94d22] transition-all">CONTINUE SHOPPING</Link>
            {isAuthenticated && <Link href="/account/orders" className="bg-[#4B2D8E] text-white font-display py-3 px-8 rounded-full hover:bg-[#3a2270] transition-all">VIEW ORDERS</Link>}
          </div>
        </section>
      </>
    );
  }

  const handlePlaceOrder = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.address || !form.city || !form.postalCode) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!canPlaceOrder) {
      toast.error('Please submit your ID for verification before placing an order');
      return;
    }
    setSubmitting(true);
    try {
      // Build admin notes to flag orders held for ID review
      const idNote = orderHeldForIdReview
        ? `[ID VERIFICATION PENDING] Guest ID submission #${guestVerificationId || 'submitted'} — hold order until age verified.`
        : undefined;

      const result = await submitOrder.mutateAsync({
        guestEmail: form.email,
        guestName: `${form.firstName} ${form.lastName}`.trim(),
        guestPhone: form.phone || undefined,
        items: items.map(item => ({
          productId: Number(item.product.id),
          productName: item.product.name,
          productImage: item.product.image || undefined,
          quantity: item.quantity,
          price: (typeof item.product.price === 'string' ? parseFloat(item.product.price) || 0 : item.product.price).toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingRate.toFixed(2),
        discount: rewardDiscount.toFixed(2),
        pointsRedeemed: 0,
        total: total.toFixed(2),
        shippingAddress: {
          street: form.address,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          country: 'Canada',
        },
        shippingZone: form.province,
        notes: [form.notes, idNote].filter(Boolean).join('\n') || undefined,
      });
      setOrderNumber(result.orderNumber);
      setOrderPlaced(true);

      // Add the order to the user's orders list so it shows on the Account > Orders tab
      if (isAuthenticated) {
        addOrder({
          id: result.orderNumber,
          date: new Date().toISOString(),
          status: 'processing',
          total: total,
          items: items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: typeof item.product.price === 'string' ? parseFloat(item.product.price) || 0 : item.product.price,
          })),
        });
      }

      clearCart();
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead title="Checkout" description="Complete your cannabis order with e-Transfer payment." noindex />
      <section className="bg-white py-6 md:py-10">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />
          <h1 className="font-display text-2xl md:text-3xl text-[#4B2D8E] mb-6">CHECKOUT</h1>

          {/* Registered user — ID NOT yet verified/submitted */}
          {idCheckRequired && isAuthenticated && user && !user.idVerified && user.idVerificationStatus === 'none' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Shield size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body text-orange-700 font-medium">One-Time ID Verification Required</p>
                <p className="text-xs font-body text-orange-600 mt-1">Verify your ID once and you'll never need to do it again.</p>
                <Link href="/account/verify-id" className="text-xs font-display text-[#F15929] hover:underline mt-2 inline-block">VERIFY NOW →</Link>
              </div>
            </div>
          )}

          {/* Registered user — ID pending review */}
          {idCheckRequired && isRegisteredPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Clock size={20} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body text-yellow-800 font-semibold">ID Verification In Review</p>
                <p className="text-xs font-body text-yellow-700 mt-1">Your ID is being reviewed. Your order will be processed once your age is verified.</p>
              </div>
            </div>
          )}

          {/* Registered user — ID approved */}
          {idCheckRequired && isRegisteredAndVerified && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <p className="text-sm font-body text-green-700"><strong>ID Verified</strong> — Your account is verified. No further ID checks needed.</p>
            </div>
          )}

          {/* Guest — hasn't submitted ID yet */}
          {idCheckRequired && !isAuthenticated && !guestIdSubmitted && (
            <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock size={20} className="text-[#4B2D8E] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-body text-[#4B2D8E] font-medium">Have an account? Sign in to skip ID verification next time.</p>
                  <p className="text-xs font-body text-gray-600 mt-1">Registered users only verify once. Guests must verify every checkout.</p>
                  <Link href="/account/login" className="text-xs font-display text-[#F15929] hover:underline mt-2 inline-block">SIGN IN →</Link>
                </div>
              </div>
            </div>
          )}

          {/* Guest — ID submitted, in review */}
          {idCheckRequired && !isAuthenticated && guestIdSubmitted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6 flex items-start gap-3">
              <Clock size={18} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body text-yellow-800 font-semibold">Guest ID Verification in Review</p>
                <p className="text-xs font-body text-yellow-700 mt-1">
                  Your order will be processed once your age is verified.
                </p>
                <p className="text-[10px] font-body text-yellow-600 mt-1">
                  Note: Guest verification is per-session. <Link href="/account/register" className="underline">Create an account</Link> to verify once.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* GUEST ID VERIFICATION — inline, shown before form if guest hasn't submitted */}
              {idCheckRequired && !isAuthenticated && !guestIdSubmitted && (
                <GuestIDVerification guestEmail={form.email} onSubmitted={(vid) => { setGuestIdSubmitted(true); setGuestVerificationId(vid); }} />
              )}

              {/* Contact */}
              <div className="bg-[#F5F5F5] rounded-2xl p-6">
                <h2 className="font-display text-lg text-[#4B2D8E] mb-4">1. CONTACT INFORMATION</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">First Name *</label>
                    <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Last Name *</label>
                    <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Phone</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-[#F5F5F5] rounded-2xl p-6">
                <h2 className="font-display text-lg text-[#4B2D8E] mb-4">2. SHIPPING ADDRESS</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Street Address *</label>
                    <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">City *</label>
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Province *</label>
                      <select value={form.province} onChange={e => { setForm({...form, province: e.target.value}); setShippingProvince(e.target.value); }}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]">
                        {canadianProvinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Postal Code *</label>
                      <input type="text" value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Order Notes (optional)</label>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E] resize-none" />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-[#F5F5F5] rounded-2xl p-6">
                <h2 className="font-display text-lg text-[#4B2D8E] mb-4">3. PAYMENT METHOD</h2>
                <div className="bg-white rounded-xl p-4 border-2 border-[#4B2D8E]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center">
                      <CreditCard size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-display text-sm text-[#4B2D8E]">INTERAC E-TRANSFER</p>
                      <p className="text-xs text-gray-500 font-body">Send payment after placing your order</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-body bg-[#F5F5F5] rounded-lg p-3">
                    After placing your order, send an e-Transfer to <strong>payments@mylegacycannabis.ca</strong>. Include your order number in the message. Your order will be processed once payment is received.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-[#F5F5F5] rounded-2xl p-6 sticky top-28">
                <h2 className="font-display text-lg text-[#4B2D8E] mb-4">ORDER SUMMARY</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {items.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover bg-white" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display text-[#333] truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500 font-body">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-mono-legacy text-[#333]">${((typeof item.product.price === 'string' ? parseFloat(item.product.price) || 0 : item.product.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm font-body border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  {rewardDiscount > 0 && <div className="flex justify-between text-[#F15929]"><span>Rewards</span><span>-${rewardDiscount.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className={isFreeShipping ? 'text-[#F15929]' : ''}>{isFreeShipping ? 'FREE' : `$${shippingRate.toFixed(2)}`}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>$0.00</span></div>
                </div>
                <div className="flex justify-between font-display text-lg border-t border-gray-200 pt-4 mb-4">
                  <span className="text-[#4B2D8E]">TOTAL</span>
                  <span className="text-[#4B2D8E]">${total.toFixed(2)}</span>
                </div>
                {isAuthenticated && (
                  <p className="text-xs text-[#4B2D8E] font-body mb-4 flex items-center gap-1">
                    <Gift size={12} className="text-[#F15929]" /> Earn <strong>{pointsToEarn} points</strong>
                  </p>
                )}

                {/* ID verification status in sidebar */}
                {idCheckRequired && !canPlaceOrder && !isAuthenticated && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-body text-orange-700 flex items-center gap-1.5">
                      <Shield size={14} className="shrink-0" />
                      Please submit your ID for verification above to place your order
                    </p>
                  </div>
                )}

                {/* Order held badge */}
                {canPlaceOrder && orderHeldForIdReview && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-body text-yellow-700 flex items-center gap-1.5">
                      <Clock size={14} className="shrink-0" />
                      Order will be held until ID is verified by My Legacy
                    </p>
                  </div>
                )}

                <button onClick={handlePlaceOrder}
                  disabled={!canPlaceOrder || submitting}
                  className={`w-full font-display py-3.5 rounded-full transition-all flex items-center justify-center gap-2 ${canPlaceOrder && !submitting ? 'bg-[#F15929] hover:bg-[#d94d22] text-white hover:scale-[1.02] active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> PLACING ORDER...</>
                    : <><Lock size={16} /> PLACE ORDER</>}
                </button>
                <p className="text-[10px] text-gray-400 font-body text-center mt-3">By placing your order, you confirm you are 19+ and agree to our Terms & Conditions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
