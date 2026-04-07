import { useParams, Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { SITE_URL, canonical, buildBreadcrumbJsonLd } from '@/lib/seo-config';
import ProductReviews from '@/components/ProductReviews';
import { useCart } from '@/contexts/CartContext';
import { shippingZones, FREE_SHIPPING_THRESHOLD, calculatePointsEarned } from '@/lib/data';
import { ShoppingCart, Minus, Plus, Truck, Star, Shield, Clock, Gift, ArrowRight, Loader } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useT, interpolate } from '@/i18n';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useBehavior } from '@/contexts/BehaviorContext';

// Grade colour badge mapping (mirrors Shop page)
const GRADE_COLORS: Record<string, string> = {
  'AAAA': 'bg-amber-500 text-white',
  'AAA+': 'bg-emerald-600 text-white',
  'AAA':  'bg-blue-600 text-white',
  'AAA-': 'bg-sky-500 text-white',
  'AA+':  'bg-purple-500 text-white',
  'AA':   'bg-gray-500 text-white',
  'SHAKE': 'bg-orange-500 text-white',
};

/** Parse a weight string like "3.5g" into a number for sorting */
function parseWeight(w: string | null | undefined): number {
  if (!w) return 0;
  const m = w.match(/([\d.]+)\s*g/i);
  return m ? parseFloat(m[1]) : 0;
}

/** Strip weight suffixes to derive the base strain name */
function deriveBaseName(name: string): string {
  return name
    .replace(/\s*[-–—]\s*\d+(\.\d+)?\s*g\b/i, '')
    .replace(/\s*\(\d+(\.\d+)?\s*g\)/i, '')
    .replace(/\s+\d+(\.\d+)?\s*g$/i, '')
    .trim();
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = trpc.store.product.useQuery({ slug: slug || '' });
  const { idVerificationEnabled } = useSiteConfig();
  const { data: authUser } = trpc.auth.me.useQuery();
  const { addItem } = useCart();
  const { t } = useT();
  const [quantity, setQuantity] = useState(1);
  const { trackProductView, trackAddToCart } = useBehavior();

  // Track product view when product loads
  useEffect(() => {
    if (product && slug) {
      trackProductView(slug, product.id, product.category);
    }
  }, [product?.id, slug]);

  // Fetch weight variants for this product
  const { data: variants } = trpc.store.productVariants.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  // All hooks must be called before any early return to satisfy React's rules of hooks
  const { data: reviewsData } = trpc.store.productReviews.useQuery(
    { productId: product?.id ?? 0 },
    { enabled: !!product?.id }
  );

  // Selected variant state — default to current product
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Sort variants by weight ascending
  const sortedVariants = useMemo(() => {
    if (!variants || variants.length <= 1) return [];
    return [...variants].sort((a: any, b: any) => parseWeight(a.weight) - parseWeight(b.weight));
  }, [variants]);

  // Determine active product (selected variant or the fetched product)
  const activeProduct = useMemo(() => {
    if (selectedVariantId && sortedVariants.length > 0) {
      const found = sortedVariants.find((v: any) => v.id === selectedVariantId);
      if (found) return found;
    }
    return product;
  }, [selectedVariantId, sortedVariants, product]);

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader className="animate-spin text-[#4B2D8E]" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl text-[#4B2D8E] mb-4">{t.productPage.notFound}</h1>
        <Link href="/shop" className="text-[#F19929] font-display hover:underline">{t.productPage.backToShop}</Link>
      </div>
    );
  }

  const ap = activeProduct as any;
  const baseName = deriveBaseName(product.name);
  const points = calculatePointsEarned(parseFloat(ap.price?.toString() || '0') * quantity);
  const priceNum = parseFloat(ap.price?.toString() || '0').toFixed(2);
  const canonicalUrl = canonical(`/product/${product.slug}`);
  const reviewAgg = reviewsData?.aggregate;
  const hasWeightVariants = sortedVariants.length > 1;

  // Product JSON-LD for Google rich results
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: baseName,
    description: product.shortDescription || product.description || '',
    image: product.image
      ? [product.image]
      : ['/logo.webp'],
    sku: `MLC-${product.id}`,
    mpn: `MLC-${product.slug}`,
    brand: {
      '@type': 'Brand',
      name: 'My Legacy Cannabis',
    },
    category: product.category,
    offers: hasWeightVariants
      ? sortedVariants.map((v: any) => ({
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'CAD',
          price: parseFloat(v.price?.toString() || '0').toFixed(2),
          priceValidUntil: '2027-01-01',
          availability: v.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          name: v.weight || '',
          seller: {
            '@type': 'Organization',
            name: 'My Legacy Cannabis',
            url: SITE_URL,
          },
        }))
      : {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'CAD',
        price: priceNum,
        priceValidUntil: '2027-01-01',
        availability: product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'My Legacy Cannabis',
          url: SITE_URL,
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '0',
            currency: 'CAD',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'CA',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            businessDays: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            },
            cutoffTime: '17:00-05:00',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 5,
              unitCode: 'DAY',
            },
          },
        },
      },
    // AggregateRating for Google rich results (only if reviews exist)
    ...(reviewAgg && reviewAgg.count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewAgg.avgRating,
        bestRating: 5,
        worstRating: 1,
        reviewCount: reviewAgg.count,
      },
    } : {}),
    additionalProperty: product.thc ? [
      {
        '@type': 'PropertyValue',
        name: 'THC',
        value: product.thc,
      },
    ] : undefined,
  };

  const handleAddToCart = () => {
    addItem(ap as any, quantity);
    trackAddToCart(ap.slug, ap.id, { quantity, price: ap.price, name: ap.name });
    toast.success(interpolate(t.productPage.addedToCartToast, { quantity, name: ap.name }));
    setQuantity(1);
  };

  return (
    <>
      <SEOHead
        title={`${baseName} — ${product.category} | My Legacy Cannabis`}
        description={product.shortDescription || product.description || `Shop ${baseName} at My Legacy Cannabis. Premium cannabis products with free shipping over $150.`}
        canonical={canonicalUrl}
        ogType="product"
        ogImage={product.image || undefined}
        jsonLd={[
          productSchema,
          buildBreadcrumbJsonLd([
            { name: 'Home', url: canonical('/') },
            { name: 'Shop', url: canonical('/shop') },
            { name: product.category, url: canonical(`/shop/${product.categorySlug || product.category?.toLowerCase().replace(/\s+/g, '-')}`) },
            { name: baseName, url: canonicalUrl },
          ]),
        ]}
      />

      <section className="bg-white py-6 md:py-10">
        <div className="container">
          <Breadcrumbs items={[{ label: t.common.home, href: '/' }, { label: t.common.shop, href: '/shop' }, { label: product.category, href: `/shop/${(product as any).categorySlug || product.category.toLowerCase().replace(/\s+/g, '-')}` }, { label: baseName }]} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Product Image */}
            <div className="flex items-center justify-center bg-[#F5F5F5] rounded-2xl aspect-square overflow-hidden">
              <img src={ap.image || 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b74?w=600'} alt={baseName} className="w-full h-full object-cover" loading="eager" width="600" height="600" fetchPriority="high" />
            </div>

            {/* Product Details */}
            <div>
              {/* Strain type + Grade + Staff Pick + Low Stock badges */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {product.featured && (
                    <span className="inline-flex items-center gap-1 bg-[#4B2D8E] text-white font-display text-xs px-3 py-1 rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      STAFF PICK
                    </span>
                  )}
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="inline-block bg-red-500 text-white font-display text-xs px-3 py-1 rounded-full animate-pulse">
                      ONLY {product.stock} LEFT
                    </span>
                  )}
                  {product.strainType && product.strainType !== 'N/A' && (
                    <span className="inline-block bg-[#F19929] text-white font-display text-xs px-3 py-1 rounded-full">{product.strainType}</span>
                  )}
                  {(product as any).grade && (
                    <span className={`inline-block font-display text-xs px-3 py-1 rounded-full ${GRADE_COLORS[(product as any).grade] || 'bg-[#4B2D8E] text-white'}`}>
                      {(product as any).grade}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-4xl md:text-5xl text-[#4B2D8E] mb-2">{baseName.toUpperCase()}</h1>
                <p className="text-gray-600 font-body">
                  {product.flavor && product.flavor !== (product as any).grade ? `${product.flavor} ` : ''}
                  {ap.weight && `• ${ap.weight}`}
                </p>
              </div>

              {/* ═══════════════════════════════════════════════════
                  WEIGHT / AMOUNT SELECTOR — shown when multiple sizes exist
                 ═══════════════════════════════════════════════════ */}
              {hasWeightVariants && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <label className="block font-display text-sm text-[#4B2D8E] mb-3">SELECT SIZE</label>
                  <div className="flex flex-wrap gap-2">
                    {sortedVariants.map((v: any) => {
                      const isSelected = ap.id === v.id;
                      const vPrice = parseFloat(v.price?.toString() || '0');
                      const outOfStock = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            setQuantity(1);
                          }}
                          disabled={outOfStock}
                          className={`relative flex flex-col items-center px-5 py-3 rounded-xl border-2 transition-all font-display text-sm ${
                            isSelected
                              ? 'border-[#4B2D8E] bg-[#4B2D8E] text-white shadow-lg scale-105'
                              : outOfStock
                                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed opacity-60'
                                : 'border-gray-200 bg-white text-[#4B2D8E] hover:border-[#4B2D8E] hover:shadow-md'
                          }`}
                        >
                          <span className="text-base font-bold">{v.weight || '—'}</span>
                          <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            ${vPrice.toFixed(2)}
                          </span>
                          {outOfStock && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-display">
                              SOLD OUT
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price + THC */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display text-4xl text-[#4B2D8E]">${priceNum}</span>
                  {hasWeightVariants && (
                    <span className="text-sm text-gray-400 font-body">/ {ap.weight}</span>
                  )}
                  <span className="text-sm text-gray-500 font-body">THC: {ap.thc || product.thc}</span>
                </div>
                <p className="text-[#F19929] font-display text-sm">{interpolate(t.productPage.earnPointsWithPurchase, { points })}</p>
              </div>

              {/* Description */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-display text-sm text-[#4B2D8E] mb-2">{t.productPage.aboutThisProduct}</h3>
                <p className="text-gray-600 font-body text-sm leading-relaxed">{product.description}</p>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="mb-6">
                <label className="block font-display text-sm text-[#4B2D8E] mb-3">{t.productPage.quantity}</label>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full border-2 border-[#4B2D8E] text-[#4B2D8E] hover:bg-[#4B2D8E] hover:text-white transition-colors flex items-center justify-center">
                    <Minus size={16} />
                  </button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center border border-gray-300 rounded-lg py-2 font-display text-lg focus:outline-none focus:ring-2 focus:ring-[#F19929]" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full border-2 border-[#4B2D8E] text-[#4B2D8E] hover:bg-[#4B2D8E] hover:text-white transition-colors flex items-center justify-center">
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={ap.stock <= 0}
                  className={`w-full font-display py-4 rounded-full transition-all flex items-center justify-center gap-2 ${
                    ap.stock > 0
                      ? 'bg-[#F19929] hover:bg-[#d98520] text-white hover:scale-105 active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart size={20} />
                  {ap.stock > 0 ? t.productPage.addToCart : 'OUT OF STOCK'}
                  {hasWeightVariants && ap.stock > 0 && (
                    <span className="text-white/70 ml-1">({ap.weight})</span>
                  )}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Truck size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">{t.productPage.freeShipping}</p>
                    <p className="text-xs text-gray-500 font-body">{interpolate(t.productPage.freeShippingDesc, { threshold: String(FREE_SHIPPING_THRESHOLD) })}</p>
                  </div>
                </div>
                {idVerificationEnabled && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">{t.productPage.ageVerified}</p>
                    <p className="text-xs text-gray-500 font-body">{t.productPage.ageVerifiedDesc}</p>
                  </div>
                </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">{t.productPage.fastDelivery}</p>
                    <p className="text-xs text-gray-500 font-body">{t.productPage.fastDeliveryDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <ProductReviews productId={product.id} isLoggedIn={!!authUser} userId={authUser?.id} />

          {/* ═══════════════════════════════════════════════════
              CUSTOMERS ALSO BOUGHT — cross-sell section
             ═══════════════════════════════════════════════════ */}
          <CrossSellSection productId={product.id} category={product.category} />
        </div>
      </section>
    </>
  );
}

/* ─── Cross-Sell Component ─── */
function CrossSellSection({ productId, category }: { productId: number; category: string }) {
  const { data: related, isLoading } = trpc.relatedProducts.useQuery(
    { productId, category, limit: 4 },
    { staleTime: 60_000 }
  );
  const { addItem } = useCart();

  if (isLoading || !related || related.length === 0) return null;

  return (
    <div className="mt-12 pt-10 border-t border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-[#4B2D8E]">CUSTOMERS ALSO BOUGHT</h2>
        <Link href={`/shop/${category}`} className="text-sm text-[#F15929] hover:underline font-display flex items-center gap-1">
          VIEW ALL <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {related.map((p: any) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow border border-gray-100">
            <Link href={`/product/${p.slug}`} className="block">
              <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                <img
                  src={p.image || 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy" width="400" height="400"
                />
                {p.featured && (
                  <span className="absolute top-2 left-2 bg-[#4B2D8E] text-white font-display text-[9px] px-2 py-0.5 rounded-full">⭐ STAFF PICK</span>
                )}
                {p.stock > 0 && p.stock <= 5 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white font-display text-[9px] px-2 py-0.5 rounded-full animate-pulse">LOW STOCK</span>
                )}
              </div>
            </Link>
            <div className="p-3">
              <Link href={`/product/${p.slug}`}>
                <h3 className="font-display text-xs text-[#4B2D8E] mb-1 hover:text-[#F15929] transition-colors line-clamp-2">
                  {p.name.toUpperCase()}
                </h3>
              </Link>
              <p className="text-[10px] text-gray-500 font-body mb-2">{p.weight} {p.thc ? `• THC: ${p.thc}` : ''}</p>
              <div className="flex items-center justify-between">
                <span className="font-display text-base text-[#4B2D8E]">
                  ${(typeof p.price === 'string' ? parseFloat(p.price) : p.price).toFixed(2)}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); addItem(p); toast.success(`${p.name} added to cart`); }}
                  className="bg-[#F15929] hover:bg-[#d94d22] text-white p-2 rounded-full transition-all hover:scale-110 active:scale-95"
                  aria-label={`Add ${p.name} to cart`}
                >
                  <ShoppingCart size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
