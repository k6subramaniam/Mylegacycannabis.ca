import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { shippingZones, FREE_SHIPPING_THRESHOLD, MINIMUM_ORDER } from '@/lib/data';
import { Truck, Package, Clock, Shield, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

export default function ShippingPolicy() {
  return (
    <>
      <SEOHead
        title="Shipping Policy — Nationwide Cannabis Delivery"
        description="My Legacy Cannabis ships nationwide across Canada via Canada Post. Free shipping on orders over $150. Ontario $10, Quebec $12, Western Canada $15, Atlantic $18, Territories $25."
        canonical="https://mylegacycannabisca-production.up.railway.app/shipping"
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shipping Policy' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white">SHIPPING POLICY</h1>
          <p className="text-white/70 font-body mt-2">Nationwide delivery across Canada via Canada Post.</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-4xl">
          {/* Free shipping banner */}
          <div className="bg-[#F15929] rounded-2xl p-6 text-white text-center mb-8">
            <Truck size={32} className="mx-auto mb-2" />
            <h2 className="font-display text-2xl mb-1">FREE SHIPPING</h2>
            <p className="font-body text-white/90">On all orders over <strong>${FREE_SHIPPING_THRESHOLD}</strong> — anywhere in Canada!</p>
          </div>

          {/* Shipping Rates Table */}
          <div className="mb-8">
            <h2 className="font-display text-2xl text-[#4B2D8E] mb-4">SHIPPING RATES</h2>
            <div className="bg-[#F5F5F5] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-[#4B2D8E] text-white font-display text-xs p-4">
                <span>REGION</span><span>RATE</span><span>DELIVERY TIME</span>
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
            <h2 className="font-display text-2xl text-[#4B2D8E]">SHIPPING DETAILS</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Package, title: 'Carrier', desc: 'All orders are shipped via Canada Post Xpresspost with tracking.' },
                { icon: Clock, title: 'Processing Time', desc: 'Orders are processed within 24 hours of payment confirmation.' },
                { icon: Shield, title: 'Discreet Packaging', desc: 'All orders are shipped in plain, unmarked packaging for your privacy.' },
                { icon: MapPin, title: 'Delivery Area', desc: 'We ship to all provinces and territories across Canada.' },
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
              <h3 className="font-display text-lg text-[#4B2D8E] mb-4">IMPORTANT INFORMATION</h3>
              <ul className="space-y-3">
                {[
                  `Minimum order amount: $${MINIMUM_ORDER}`,
                  `Free shipping on orders over $${FREE_SHIPPING_THRESHOLD}`,
                  'Signature required upon delivery (age verification)',
                  'No P.O. Box deliveries — street address required',
                  'Tracking number provided via email once shipped',
                  'E-Transfer payment must be received before order is shipped',
                  'Orders placed on weekends/holidays are processed the next business day',
                  'My Legacy Cannabis is not responsible for delays caused by Canada Post',
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
                  <h3 className="font-display text-sm text-orange-700">AGE VERIFICATION REQUIRED</h3>
                  <p className="text-sm text-orange-600 font-body mt-1">All customers must be 19 years of age or older. ID verification is required during account registration. A signature from an adult (19+) is required upon delivery.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
