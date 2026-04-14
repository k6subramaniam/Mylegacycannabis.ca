import { Link, useParams, useSearch } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { ROUTE_SEO, CATEGORY_SEO, canonical, buildBreadcrumbJsonLd, SITE_URL } from '@/lib/seo-config';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { categories } from '@/lib/data';
import { ShoppingCart, Star, Loader, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useT } from '@/i18n';
import { useBehavior } from '@/contexts/BehaviorContext';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-shop-5tiqFdCHUdeMeR3zPVXYu5.webp';

// Grade colour badge mapping
const GRADE_COLORS: Record<string, string> = {
  'AAAA': 'bg-amber-500 text-white',
  'AAA+': 'bg-emerald-600 text-white',
  'AAA':  'bg-blue-600 text-white',
  'AAA-': 'bg-sky-500 text-white',
  'AA+':  'bg-purple-500 text-white',
  'AA':   'bg-gray-500 text-white',
  'SHAKE': 'bg-orange-500 text-white',
};

// Grade ordering for sorting (lower index = higher grade)
const GRADE_ORDER = ['AAAA', 'AAA+', 'AAA', 'AAA-', 'AA+', 'AA', 'AA-', 'A+', 'A', 'SHAKE'];

// Grade filter buttons displayed in the grade bar
const GRADE_FILTERS = ['AAAA', 'AAA+', 'AAA', 'AAA-', 'AA+', 'AA', 'SHAKE'];

// Strain/type pill options
const STRAIN_TYPES = ['Indica', 'Sativa', 'Hybrid'];

// Categories that show grade filters
const GRADE_CATEGORIES = new Set(['flower', 'pre-rolls', 'ounce-deals', 'shake-n-bake', '']);

// Categories that are cannabis-product-related (show strain pills, grade filters, NOT price sort, group by strain)
const FLOWER_CATEGORIES = new Set(['flower', 'pre-rolls', 'ounce-deals', 'shake-n-bake']);

/**
 * Strip weight suffixes to get a base strain name for grouping.
 * "Pink Taco - 3.5g" → "Pink Taco"
 * "OG Kush 7g" → "OG Kush"
 */
function deriveBaseName(name: string): string {
  return name
    .replace(/\s*[-–—]\s*\d+(\.\d+)?\s*g\b/i, '')
    .replace(/\s*\(\d+(\.\d+)?\s*g\)/i, '')
    .replace(/\s+\d+(\.\d+)?\s*g$/i, '')
    .trim();
}

/** Parse a weight string like "3.5g" into a number for sorting */
function parseWeight(w: string | null | undefined): number {
  if (!w) return 0;
  const m = w.match(/([\d.]+)\s*g/i);
  return m ? parseFloat(m[1]) : 0;
}

interface GroupedProduct {
  /** The representative product (lowest weight / first) */
  product: any;
  /** Base strain name used for grouping */
  baseName: string;
  /** All weight variants for this strain */
  variants: any[];
  /** Lowest price across variants */
  fromPrice: number;
  /** Price range string like "$35 - $220" or just "$35.00" */
  priceLabel: string;
}

export default function Shop() {
  const { t } = useT();
  const params = useParams<{ category?: string }>();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const urlCategory = params.category || searchParams.get('category') || '';

  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedStrain, setSelectedStrain] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const { addItem } = useCart();
  const { trackCategoryView, trackSearch, trackAddToCart } = useBehavior();

  // Reset strain + grade when category changes
  useEffect(() => {
    setSelectedStrain('');
    setSelectedGrade('');
    setSortBy('featured');
    if (selectedCategory) trackCategoryView(selectedCategory);
  }, [selectedCategory]);

  // Fetch products from backend
  const { data: productsData, isLoading } = trpc.store.products.useQuery({
    category: selectedCategory || undefined,
    limit: 200,
  });

  const products = Array.isArray(productsData?.data) ? productsData.data : [];

  // Determine UI visibility flags based on selected category
  const isFlowerCategory = FLOWER_CATEGORIES.has(selectedCategory);
  const showGrades = GRADE_CATEGORIES.has(selectedCategory);
  const showStrainPills = selectedCategory !== 'accessories';
  // For flower-related categories, hide price sorting — keep potency/grade sort
  const hideFlowerPriceSort = isFlowerCategory;

  const activeCat = categories.find(c => c.slug === selectedCategory);
  const pageTitle = activeCat ? `${activeCat.name} — Shop` : 'Shop All Products';

  /**
   * Group products by strain name so each strain shows ONE tile,
   * but only for flower-related categories. Non-flower categories show every product.
   */
  const grouped = useMemo<GroupedProduct[]>(() => {
    let result = [...products];

    // Apply strain filter
    if (selectedStrain) {
      result = result.filter((p: any) => p.strainType === selectedStrain);
    }
    // Apply grade filter
    if (selectedGrade) {
      result = result.filter((p: any) => p.grade === selectedGrade);
    }

    // For flower-related categories, group by base name (one tile per strain)
    const shouldGroup = isFlowerCategory || selectedCategory === '';
    if (shouldGroup) {
      const groupMap = new Map<string, any[]>();
      for (const p of result) {
        // Only group flower/ounce-deals/shake products
        if (FLOWER_CATEGORIES.has((p as any).category)) {
          const base = deriveBaseName(p.name);
          if (!groupMap.has(base)) groupMap.set(base, []);
          groupMap.get(base)!.push(p);
        } else {
          // Non-flower products get their own group
          const key = `__single_${p.id}`;
          groupMap.set(key, [p]);
        }
      }

      const groups: GroupedProduct[] = [];
      for (const [key, variants] of Array.from(groupMap.entries())) {
        // Sort variants by weight ascending
        variants.sort((a: any, b: any) => parseWeight(a.weight) - parseWeight(b.weight));
        const prices = variants.map((v: any) => parseFloat(v.price?.toString() || '0'));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceLabel = variants.length > 1 && minPrice !== maxPrice
          ? `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`
          : `$${minPrice.toFixed(2)}`;

        groups.push({
          product: variants[0], // representative product (smallest weight)
          baseName: key.startsWith('__single_') ? variants[0].name : deriveBaseName(variants[0].name),
          variants,
          fromPrice: minPrice,
          priceLabel,
        });
      }
      return groups;
    }

    // For non-flower categories, each product is its own group
    return result.map(p => {
      const price = parseFloat(p.price?.toString() || '0');
      return {
        product: p,
        baseName: p.name,
        variants: [p],
        fromPrice: price,
        priceLabel: `$${price.toFixed(2)}`,
      };
    });
  }, [products, selectedStrain, selectedGrade, isFlowerCategory, selectedCategory]);

  // Sort the grouped results
  const sorted = useMemo(() => {
    const result = [...grouped];
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.fromPrice - b.fromPrice);
        break;
      case 'price-high':
        result.sort((a, b) => b.fromPrice - a.fromPrice);
        break;
      case 'name':
        result.sort((a, b) => a.baseName.localeCompare(b.baseName));
        break;
      case 'grade': {
        result.sort((a, b) => {
          const aIdx = GRADE_ORDER.indexOf((a.product as any).grade || '');
          const bIdx = GRADE_ORDER.indexOf((b.product as any).grade || '');
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
        break;
      }
      case 'potency': {
        // Sort by THC potency (stronger first)
        const parseTHC = (thc: string | undefined) => {
          if (!thc) return 0;
          const nums = thc.match(/(\d+)/g);
          if (!nums) return 0;
          return Math.max(...nums.map(Number));
        };
        result.sort((a, b) => parseTHC(b.product.thc) - parseTHC(a.product.thc));
        break;
      }
      default:
        result.sort((a, b) => (b.product.featured ? 1 : 0) - (a.product.featured ? 1 : 0));
    }
    return result;
  }, [grouped, sortBy]);

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }];
  if (activeCat) breadcrumbs.push({ label: activeCat.name, href: '' });

  return (
    <>
      <SEOHead
        title={selectedCategory && CATEGORY_SEO[selectedCategory] ? CATEGORY_SEO[selectedCategory].title : pageTitle}
        description={selectedCategory && CATEGORY_SEO[selectedCategory] ? CATEGORY_SEO[selectedCategory].description : (activeCat ? activeCat.description : ROUTE_SEO['/shop'].description)}
        canonical={canonical(`/shop${selectedCategory ? '/' + selectedCategory : ''}`)}
        ogImage={HERO_IMG}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Home', url: canonical('/') },
          { name: 'Shop', url: canonical('/shop') },
          ...(activeCat ? [{ name: activeCat.name, url: canonical(`/shop/${selectedCategory}`) }] : []),
        ])}
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] py-6 md:py-10 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Shop cannabis products" className="w-full h-full object-cover opacity-40" loading="eager" width="1440" height="400" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10">
          <Breadcrumbs items={breadcrumbs} variant="dark" />
          <h1 className="font-display text-4xl md:text-5xl text-white mt-4">
            {pageTitle.toUpperCase()}
          </h1>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ROW 1 — MAIN CATEGORY BAR (All / Flower / Pre-Rolls / …)
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-200 sticky top-[96px] md:top-[112px] z-30">
        <div className="container">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-4 py-2 rounded-full font-display text-xs transition-all whitespace-nowrap ${
                !selectedCategory
                  ? 'bg-[#4B2D8E] text-white shadow-md'
                  : 'bg-[#F5F5F5] text-gray-600 hover:bg-[#4B2D8E]/10 hover:text-[#4B2D8E]'
              }`}
            >
              ALL
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`shrink-0 px-4 py-2 rounded-full font-display text-xs transition-all whitespace-nowrap ${
                  selectedCategory === cat.slug
                    ? 'bg-[#4B2D8E] text-white shadow-md'
                    : 'bg-[#F5F5F5] text-gray-600 hover:bg-[#4B2D8E]/10 hover:text-[#4B2D8E]'
                }`}
              >
                {cat.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ROW 2 — GRADE FILTER BAR (All Grades / AAAA / AAA+ / …)
         ═══════════════════════════════════════════════════════════ */}
      {showGrades && (
        <section className="bg-white border-b border-gray-200">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide -mx-1 px-1">
              <span className="shrink-0 text-[11px] font-display text-gray-400 mr-1">GRADE:</span>
              <button
                onClick={() => setSelectedGrade('')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full font-display text-[11px] transition-all whitespace-nowrap ${
                  !selectedGrade
                    ? 'bg-[#4B2D8E] text-white shadow-sm'
                    : 'bg-[#F5F5F5] text-gray-500 hover:bg-[#4B2D8E]/10 hover:text-[#4B2D8E] border border-gray-200'
                }`}
              >
                ALL GRADES
              </button>
              {GRADE_FILTERS.map(grade => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(selectedGrade === grade ? '' : grade)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-display text-[11px] transition-all whitespace-nowrap ${
                    selectedGrade === grade
                      ? (GRADE_COLORS[grade] || 'bg-[#4B2D8E] text-white') + ' shadow-sm'
                      : 'bg-[#F5F5F5] text-gray-500 hover:bg-[#4B2D8E]/10 border border-gray-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ROW 3 — STRAIN TYPE PILLS (Indica / Sativa / Hybrid)
         ═══════════════════════════════════════════════════════════ */}
      {showStrainPills && (
        <section className="bg-[#F5F5F5] border-b border-gray-200">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide -mx-1 px-1">
              <span className="shrink-0 text-[11px] font-display text-gray-400 mr-1">TYPE:</span>
              {STRAIN_TYPES.map(strain => (
                <button
                  key={strain}
                  onClick={() => setSelectedStrain(selectedStrain === strain ? '' : strain)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-display text-[11px] transition-all whitespace-nowrap ${
                    selectedStrain === strain
                      ? 'bg-[#F19929] text-white shadow-sm'
                      : 'bg-white text-gray-500 hover:bg-[#F19929]/10 hover:text-[#F19929] border border-gray-200'
                  }`}
                >
                  {strain.toUpperCase()}
                </button>
              ))}
              {selectedStrain && (
                <button
                  onClick={() => setSelectedStrain('')}
                  className="text-[10px] text-[#F19929] font-display hover:underline ml-1"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="bg-white py-6 md:py-10">
        <div className="container">

          {/* ── Inline Sort Bar ── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#F5F5F5] border border-gray-200 rounded-full pl-4 pr-9 py-2 text-xs font-display text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/30 cursor-pointer"
              >
                <option value="featured">FEATURED</option>
                {/* Price sorting hidden for flower-related categories */}
                {!hideFlowerPriceSort && <option value="price-low">PRICE: LOW → HIGH</option>}
                {!hideFlowerPriceSort && <option value="price-high">PRICE: HIGH → LOW</option>}
                <option value="name">NAME: A → Z</option>
                {showGrades && <option value="grade">GRADE: BEST FIRST</option>}
                {isFlowerCategory && <option value="potency">POTENCY: STRONGEST FIRST</option>}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Product count */}
            <span className="text-xs text-gray-400 font-body ml-auto">
              {sorted.length} {sorted.length === 1 ? 'strain' : isFlowerCategory ? 'strains' : 'products'}
            </span>
          </div>

          {/* Mix-and-match note for ounce deals / shake */}
          {(selectedCategory === 'ounce-deals' || selectedCategory === 'shake-n-bake') && (
            <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-3 mb-5 text-center">
              <p className="text-sm font-body text-[#4B2D8E]">*Mix and match available within same category/pricing</p>
            </div>
          )}

          {/* Loading State — skeleton grid to prevent CLS */}
          {isLoading && (
            <div className="product-grid-skeleton" role="status" aria-label="Loading products">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="product-card-skeleton rounded-xl" />
              ))}
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && (
            <>
              {sorted.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 font-body text-lg mb-2">No products found.</p>
                  <p className="text-gray-400 font-body text-sm">Try selecting a different category or clearing your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sorted.map((group) => {
                    const product = group.product;
                    const hasVariants = group.variants.length > 1;
                    return (
                      <div key={product.id}
                        className="bg-white rounded-2xl overflow-hidden group hover:shadow-2xl transition-all border border-gray-100">
                        <Link href={`/product/${product.slug}`} className="block">
                          <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                            <img
                              src={product.image || 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400'}
                              alt={group.baseName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" width="400" height="400"
                            />

                            {/* Top-left badges: Grade + NEW + Staff Pick + Low Stock */}
                            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                              {product.isNew && (
                                <span className="bg-[#F19929] text-white font-display text-[10px] px-3 py-1 rounded-full">NEW</span>
                              )}
                              {product.featured && (
                                <span className="bg-[#4B2D8E] text-white font-display text-[10px] px-3 py-1 rounded-full flex items-center gap-1">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                  STAFF PICK
                                </span>
                              )}
                              {product.stock > 0 && product.stock <= 5 && (
                                <span className="bg-red-500 text-white font-display text-[10px] px-3 py-1 rounded-full animate-pulse">
                                  LOW STOCK
                                </span>
                              )}
                              {(product as any).grade && (
                                <span className={`font-display text-[10px] px-2.5 py-1 rounded-full ${GRADE_COLORS[(product as any).grade] || 'bg-gray-400 text-white'}`}>
                                  {(product as any).grade}
                                </span>
                              )}
                            </div>

                            {/* Top-right strain type badge */}
                            {product.strainType && product.strainType !== 'N/A' && (
                              <span className="absolute top-3 right-3 bg-[#4B2D8E] text-white font-mono text-[10px] px-2 py-1 rounded-full">
                                {product.strainType}
                              </span>
                            )}

                            {/* Bottom-right: variant count indicator */}
                            {hasVariants && (
                              <span className="absolute bottom-3 right-3 bg-black/60 text-white font-display text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                                {group.variants.length} sizes
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="p-4">
                          <Link href={`/product/${product.slug}`}>
                            <h3 className="font-display text-sm text-[#4B2D8E] mb-1 hover:text-[#F19929] transition-colors line-clamp-2">
                              {group.baseName.toUpperCase()}
                            </h3>
                          </Link>

                          {/* Show weight range or single weight */}
                          {hasVariants ? (
                            <p className="text-xs text-gray-500 font-body mb-1">
                              {group.variants.map(v => v.weight).filter(Boolean).join(' · ')}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 font-body mb-1">
                              {product.flavor && product.flavor !== product.grade ? `${product.flavor} · ` : ''}{product.weight}
                            </p>
                          )}

                          <p className="text-xs text-gray-400 font-mono mb-3">THC: {product.thc}</p>

                          <div className="flex items-center justify-between">
                            {/* Price: show "From $XX" for multi-variant, or exact price */}
                            <div>
                              {hasVariants && (
                                <span className="text-[10px] text-gray-400 font-display block">FROM</span>
                              )}
                              <span className="font-display text-lg text-[#4B2D8E]">
                                {group.priceLabel}
                              </span>
                            </div>

                            {/* Add-to-cart for single-variant; "View" for multi-variant */}
                            {hasVariants ? (
                              <Link
                                href={`/product/${product.slug}`}
                                className="bg-[#4B2D8E] hover:bg-[#3A2270] text-white px-3 py-2 rounded-full text-[11px] font-display transition-all hover:scale-105 active:scale-95"
                              >
                                SELECT SIZE
                              </Link>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  addItem({
                                    ...product,
                                    id: String(product.id),
                                    categorySlug: product.category,
                                    strainType: product.strainType || 'N/A',
                                    price: parseFloat(product.price?.toString() || '0'),
                                    inStock: product.stock > 0,
                                    rating: 4.5,
                                    reviewCount: 0,
                                    images: product.images || [],
                                    image: product.image || '',
                                    description: product.description || '',
                                    shortDescription: product.shortDescription || '',
                                    flavor: product.flavor || '',
                                    weight: product.weight || '',
                                  } as any);
                                  trackAddToCart(product.slug, product.id, { price: product.price, name: product.name });
                                  toast.success(`${product.name} added to cart`);
                                }}
                                className="bg-[#F19929] hover:bg-[#d98520] text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                                aria-label={`Add ${product.name} to cart`}
                              >
                                <ShoppingCart size={16} />
                              </button>
                            )}
                          </div>

                          <p className="text-[10px] text-[#4B2D8E] font-body mt-2 flex items-center gap-1">
                            <Star size={10} className="text-[#F19929]" /> Earn {group.fromPrice.toFixed(0)} points
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
