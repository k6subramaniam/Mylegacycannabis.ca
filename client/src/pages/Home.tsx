import SEOHead from '@/components/SEOHead';
import { Link } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { products, categories, storeLocations, FREE_SHIPPING_THRESHOLD } from '@/lib/data';
import { WaveDivider } from '@/components/Layout';
import { ShoppingCart, MapPin, Phone, Clock, Truck, Shield, Star, Gift, ArrowRight, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-main-nBCmJTxSfhqeiDs3Vxut62.webp';

export default function Home() {
  const { addItem } = useCart();
  const featured = products.filter(p => p.featured).slice(0, 4);

  return (
    <>
      <SEOHead
        title="My Legacy Cannabis — 24/7 Cannabis Dispensary | GTA & Ottawa"
        description="24/7 cannabis dispensary with 5 GTA & Ottawa locations. Shop flower, edibles, vapes & more. Free shipping over $150 Canada-wide."
        canonical="https://mylegacycannabisca-production.up.railway.app/"
      />

      {/* HERO SECTION — no animations, content immediately visible for LCP */}
      <section className="relative bg-[#4B2D8E] overflow-hidden" style={{ minHeight: '400px' }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Premium cannabis products from My Legacy Cannabis dispensary"
            className="w-full h-full object-cover opacity-40"
            loading="eager"
            width="1440"
            height="600"
            fetchPriority="high"
            decoding="async"
            style={{ display: 'block' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-16 md:py-24 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#F15929] text-white font-display text-xs px-4 py-1.5 rounded-full mb-4">OPEN 24/7 — 5 LOCATIONS</span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-4">
              WELCOME TO<br /><span className="text-[#F15929]">MY LEGACY</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-body mb-8 max-w-xl leading-relaxed">
              My Legacy Cannabis is your go-to 24/7 dispensary with locations across the Greater Toronto Area and Ottawa. We're passionate about providing premium cannabis products at fair prices, with knowledgeable staff ready to help you find exactly what you need.
            </p>
            <p className="text-white/80 text-lg md:text-xl font-body mb-8 max-w-xl leading-relaxed">
              Whether you prefer shopping in-store or online, we've got you covered with nationwide shipping across Canada via Canada Post. No taxes on any orders, and <strong className="text-[#F15929] font-display">FREE shipping on orders over $150</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display text-base py-3.5 px-8 rounded-full transition-all hover:scale-105 active:scale-95">
                SHOP NOW <ArrowRight size={18} />
              </Link>
              <Link href="/locations" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-display text-base py-3.5 px-8 rounded-full transition-all border border-white/30">
                FIND A STORE <MapPin size={18} />
              </Link>
            </div>
          </div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* TRUST BADGES — static, no animation, immediately visible */}
      <section className="bg-white py-8 -mt-1">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'Orders over $150' },
              { icon: Clock, label: 'Open 24/7', sub: 'Always available' },
              { icon: Shield, label: 'Age Verified', sub: 'Safe & secure' },
              { icon: Gift, label: 'Earn Rewards', sub: '1 point per $1' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F5]">
                <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                  <badge.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-display text-xs text-[#4B2D8E]">{badge.label}</p>
                  <p className="text-xs text-gray-500 font-body">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY GRID — static headings, lazy-loaded images below fold */}
      <section className="bg-white py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-[#4B2D8E] mb-3">FIND YOUR LEGACY</h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">Browse our curated selection of premium cannabis products.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/shop/${cat.slug}`}
                className="group block relative rounded-2xl overflow-hidden bg-[#F5F5F5] aspect-[4/3] hover:shadow-xl transition-all">
                <img
                  src={cat.image}
                  alt={`${cat.name} cannabis products`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  width="400"
                  height="300"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#4B2D8E]/90 via-[#4B2D8E]/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-display text-lg md:text-xl text-white">{cat.name.toUpperCase()}</h3>
                  <p className="text-white/70 text-xs font-body mt-1">{cat.productCount} Products</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider color="#4B2D8E" />

      {/* FEATURED PRODUCTS — static grid, no opacity-0 animations */}
      <section className="bg-[#4B2D8E] py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-3">FEATURED PRODUCTS</h2>
            <p className="text-white/70 font-body max-w-lg mx-auto">Hand-picked favourites from our collection.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden group hover:shadow-2xl transition-shadow">
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      width="400"
                      height="400"
                      decoding="async"
                    />
                    {product.isNew && (
                      <span className="absolute top-3 left-3 bg-[#F15929] text-white font-display text-[10px] px-3 py-1 rounded-full">NEW</span>
                    )}
                    <span className="absolute top-3 right-3 bg-[#4B2D8E] text-white font-mono-legacy text-xs px-2 py-1 rounded-full">{product.strainType}</span>
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="font-display text-sm text-[#4B2D8E] mb-1 hover:text-[#F15929] transition-colors">{product.name.toUpperCase()}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 font-body mb-1">{product.flavor} · {product.weight}</p>
                  <p className="text-xs text-gray-400 font-mono-legacy mb-3">THC: {product.thc}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg text-[#4B2D8E]">${(typeof product.price === 'string' ? parseFloat(product.price) : product.price).toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); addItem(product); toast.success(`${product.name} added to cart`); }}
                      className="bg-[#F15929] hover:bg-[#d94d22] text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <ShoppingCart size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#4B2D8E] font-body mt-2 flex items-center gap-1">
                    <Star size={10} className="text-[#F15929]" /> Earn {Math.floor(typeof product.price === 'string' ? parseFloat(product.price) : product.price)} points with this purchase
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/shop" className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-8 rounded-full transition-all hover:scale-105">
              VIEW ALL PRODUCTS <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <WaveDivider color="#F5F5F5" />

      {/* SHIPPING BANNER — static, no opacity-0 initial state */}
      <section className="bg-[#F5F5F5] py-12 -mt-1">
        <div className="container">
          <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                <Truck size={28} className="text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="font-display text-2xl text-[#4B2D8E] mb-2">NATIONWIDE SHIPPING</h2>
                <p className="text-gray-600 font-body">We ship coast-to-coast across Canada via Canada Post. <strong className="text-[#F15929]">FREE shipping on orders over ${FREE_SHIPPING_THRESHOLD}!</strong></p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4 font-mono-legacy text-xs">
                  {[['ON', '$10'], ['QC', '$12'], ['West', '$15'], ['Atlantic', '$18'], ['North', '$25']].map(([r, p]) => (
                    <span key={r} className="bg-[#F5F5F5] px-3 py-1.5 rounded-full text-[#333]">{r}: {p}</span>
                  ))}
                </div>
              </div>
              <Link
                href="/shipping"
                className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-6 rounded-full transition-all hover:scale-105 shrink-0"
                aria-label="Learn more about our nationwide shipping policy"
              >
                LEARN MORE
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* REWARDS BANNER — static */}
      <section className="bg-[#F5F5F5] pb-12">
        <div className="container">
          <div className="bg-[#4B2D8E] rounded-2xl p-6 md:p-10 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F15929]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#F15929] flex items-center justify-center shrink-0">
                <Gift size={28} className="text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="font-display text-2xl mb-2">MY LEGACY REWARDS</h2>
                <p className="text-white/80 font-body">Earn 1 point for every $1 spent. Redeem for discounts up to $150 OFF. Get 25 bonus points just for signing up!</p>
              </div>
              <Link href="/rewards" className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-6 rounded-full transition-all hover:scale-105 shrink-0">
                JOIN NOW
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="#ffffff" />

      {/* LOCATIONS — static grid, no opacity-0 */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-[#4B2D8E] mb-3">OUR LOCATIONS</h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">Visit any of our 5 locations across the GTA and Ottawa — open 24/7.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeLocations.slice(0, 3).map((loc) => (
              <div key={loc.id} className="bg-[#F5F5F5] rounded-2xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-[#4B2D8E]">{loc.name.toUpperCase()}</h3>
                    <p className="text-sm text-gray-600 font-body">{loc.address}, {loc.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-body text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><Clock size={14} /> 24/7</span>
                  <a href={`tel:${loc.phone.replace(/\D/g, '')}`} className="flex items-center gap-1 text-[#F15929] hover:underline"><Phone size={14} /> {loc.phone}</a>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${loc.phone.replace(/\D/g, '')}`} aria-label={`Call My Legacy Cannabis ${loc.name}`} className="flex-1 bg-[#4B2D8E] text-white text-center font-display text-xs py-2.5 rounded-full hover:bg-[#3a2270] transition-colors">CALL NOW</a>
                  <a href={loc.directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to My Legacy Cannabis ${loc.name}`} className="flex-1 bg-[#F15929] text-white text-center font-display text-xs py-2.5 rounded-full hover:bg-[#d94d22] transition-colors">DIRECTIONS</a>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/locations" className="text-[#4B2D8E] hover:text-[#F15929] font-display text-sm transition-colors inline-flex items-center gap-1">
              VIEW ALL 5 LOCATIONS <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-[#F15929] py-12 md:py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Leaf size={32} className="text-white/50 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-white mb-3">STAY IN THE LOOP</h2>
            <p className="text-white/80 font-body mb-6">Subscribe for exclusive deals, new product drops, and rewards program updates.</p>
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* Organization schema lives in index.html — no duplicate here */}
    </>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { toast.success('Thanks for subscribing!'); setEmail(''); }
  };
  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-6 py-4 rounded-xl bg-[#F15929]/70 border border-white/30 text-white placeholder-white/50 font-mono-legacy text-base focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-[#F15929]/80 transition-all"
          required
          aria-label="Email address"
        />
        <button type="submit" className="mt-4 w-full bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3.5 px-8 rounded-xl transition-all hover:scale-105 active:scale-95">
          SUBSCRIBE
        </button>
      </div>
    </form>
  );
}
