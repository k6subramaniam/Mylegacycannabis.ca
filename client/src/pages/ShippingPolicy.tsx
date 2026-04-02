import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { shippingZones, FREE_SHIPPING_THRESHOLD, MINIMUM_ORDER } from '@/lib/data';
import { Truck, Package, Clock, Shield, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n';

export default function ShippingPolicy() {
  const { t } = useT();
  return (
    <>
      <SEOHead
        title="Shipping Policy — Nationwide Cannabis Delivery"
        description="My Legacy Cannabis ships nationwide across Canada. Free shipping on orders over $150. Ontario $10, Quebec $12, Western Canada $15, Atlantic $18, Territories $25."
        canonical="https://mylegacycannabisca-production.up.railway.app/shipping"
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shipping Policy' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white">{t.shippingPage.title}</h1>
          <p className="text-white/70 font-body mt-2">{t.shippingPage.subtitle}</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-4xl">
          {/* Free shipping banner */}
          <div className="bg-[#F15929] rounded-2xl p-6 text-white text-center mb-8">
            <Truck size={32} className="mx-auto mb-2" />
            <h2 className="font-display text-2xl mb-1">{t.shippingPage.freeShipping}</h2>
            <p className="font-body text-white/90">{t.shippingPage.freeShippingDesc.replace('{threshold}', String(FREE_SHIPPING_THRESHOLD))}</p>
          </div>

          {/* Shipping Rates Table */}
          <div className="mb-8">
            <h2 className="font-display text-2xl text-[#4B2D8E] mb-4">{t.shippingPage.shippingRates}</h2>
            <div className="bg-[#F5F5F5] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-[#4B2D8E] text-white font-display text-xs p-4">
                <span>{t.shippingPage.region}</span><span>{t.shippingPage.rate}</span><span>{t.shippingPage.deliveryTime}</span>
              </div>
              {shippingZones.map((zone, i) => (
                <div key={zone.name} className={`grid grid-cols-3 p-4 text-sm font-body ${i % 2 === 0 ? 'bg-white' : 'bg-[#F5F5F5]'}`}>
                  <div>
                    <p className="font-medium text-[#333]">{zone.name}</p>
                    <p className="text-xs text-gray-400">{zone.provinces.join(', ')}</p>
                  </div>
                  <span className="font-mono-legacy text-[#4B2D8E] font-medium">${zone.rate.toFixed(2)}</span>
                  <span className="text-gray-600">{zone.deliveryTime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Policies */}
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-[#4B2D8E]">{t.shippingPage.shippingDetails}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Package, title: t.shippingPage.carrier, desc: t.shippingPage.carrierDesc },
                { icon: Clock, title: t.shippingPage.processingTime, desc: t.shippingPage.processingTimeDesc },
                { icon: Shield, title: t.shippingPage.discreetPackaging, desc: t.shippingPage.discreetPackagingDesc },
                { icon: MapPin, title: t.shippingPage.deliveryArea, desc: t.shippingPage.deliveryAreaDesc },
              ].map((item, i) => (
                <div key={i} className="bg-[#F5F5F5] rounded-xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <item.icon size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm text-[#4B2D8E]">{item.title}</h3>
                    <p className="text-sm text-gray-600 font-body mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h3 className="font-display text-lg text-[#4B2D8E] mb-4">{t.shippingPage.importantInfo}</h3>
              <ul className="space-y-3">
                {[
                  `Minimum order amount: $${MINIMUM_ORDER}`,
                  `Free shipping on orders over $${FREE_SHIPPING_THRESHOLD}`,
                  'Signature required upon delivery (age verification)',
                  'No P.O. Box deliveries — street address required',
                  'Tracking number provided via email once shipped',
                  'E-Transfer payment must be received before order is shipped',
                  'Orders placed on weekends/holidays are processed the next business day',
                  'My Legacy Cannabis is not responsible for shipping delays beyond our control',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-body text-gray-600">
                    <CheckCircle size={16} className="text-[#F15929] shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-sm text-orange-700">{t.shippingPage.ageVerificationRequired}</h3>
                  <p className="text-sm text-orange-600 font-body mt-1">{t.shippingPage.ageVerificationDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
