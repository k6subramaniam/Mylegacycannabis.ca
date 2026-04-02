import { Link, useParams, useSearch } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { categories } from '@/lib/data';
import { ShoppingCart, SlidersHorizontal, X, Star, Loader, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useT } from '@/i18n';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-shop-5tiqFdCHUdeMeR3zPVXYu5.webp';

// Subcategory map for Flower category — mirrors the menu image structure
const FLOWER_SUBCATEGORIES = [
  { label: 'All Flower', value: '' },
  { label: 'Indica', value: 'Indica Flower' },
  { label: 'Sativa', value: 'Sativa Flower' },
  { label: 'Hybrid', value: 'Hybrid Flower' },
];

// Grade colour badge mapping
const GRADE_COLORS: Record<string, string> = {
  'AAAA': 'bg-amber-500 text-white',
  'AAA+': 'bg-emerald-600 text-white',
  'AAA': 'bg-blue-600 text-white',
  'AAA-': 'bg-sky-500 text-white',
  'AA+': 'bg-purple-500 text-white',
  'AA': 'bg-gray-500 text-white',
  'SHAKE': 'bg-orange-500 text-white',
};

export default function Shop() {
  const { t } = useT();
  const params = useParams<{ category?: string }>();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const urlCategory = params.category || searchParams.get('category') || '';

  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedStrain, setSelectedStrain] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const { addItem } = useCart();

  // Reset subcategory + strain when category changes
  useEffect(() => {
    setSelectedSubcategory('');
    setSelectedStrain('');
  }, [selectedCategory]);

  // Fetch products from backend
  const { data: productsData, isLoading } = trpc.store.products.useQuery({
    category: selectedCategory || undefined,
    limit: 100,
  });

  const products = Array.isArray(productsData?.data) ? productsData.data : [];

  const filtered = useMemo(() => {
    let result = [...products];
    // Apply subcategory filter (for flower)
    if (selectedSubcategory) {
      result = result.filter((p: any) => p.subcategory === selectedSubcategory);
    }
    if (selectedStrain) result = result.filter(p => p.strainType === selectedStrain);
    switch (sortBy) {
      case 'price-low': result.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString())); break;
      case 'price-high': result.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString())); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'grade': result.sort((a, b) => {
        const gradeOrder = ['AAAA', 'AAA+', 'AAA', 'AAA-', 'AA+', 'AA', 'AA-', 'A+', 'A', 'SHAKE'];
        const aIdx = gradeOrder.indexOf((a as any).grade || '');
        const bIdx = gradeOrder.indexOf((b as any).grade || '');
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      }); break;
      default: result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }, [products, selectedSubcategory, selectedStrain, sortBy]);

  const activeCat = categories.find(c => c.slug === selectedCategory);
  const pageTitle = activeCat ? `${activeCat.name} — Shop` : 'Shop All Products';
  const showSubcategories = selectedCategory === 'flower';
  const showGradeSort = selectedCategory === 'flower' || selectedCategory === 'ounce-deals' || selectedCategory === 'shake-n-bake';

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }];
  if (activeCat) breadcrumbs.push({ label: activeCat.name, href: '' });

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={activeCat ? activeCat.description : 'Browse our full selection of premium cannabis products — flower, pre-rolls, edibles, vapes, concentrates, and accessories. Free shipping on orders over $150.'}
        canonical={`https://mylegacycannabisca-production.up.railway.app/shop${selectedCategory ? '/' + selectedCategory : ''}`}
        ogImage={HERO_IMG}
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
          HORIZONTAL CATEGORY BAR — always visible, left to right
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

      {/* Subcategory Tabs — shown for Flower (Indica / Sativa / Hybrid) */}
      {showSubcategories && (
        <section className="bg-[#F5F5F5] border-b border-gray-200">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide -mx-1 px-1">
              {FLOWER_SUBCATEGORIES.map(sub => (
                <button
                  key={sub.value}
                  onClick={() => setSelectedSubcategory(sub.value)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-display text-[11px] transition-all whitespace-nowrap ${
                    selectedSubcategory === sub.value
                      ? 'bg-[#F15929] text-white shadow-sm'
                      : 'bg-white text-gray-500 hover:bg-[#F15929]/10 hover:text-[#F15929] border border-gray-200'
                  }`}
                >
                  {sub.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="bg-white py-6 md:py-10">
        <div className="container">

          {/* ── Inline Filter Bar (Sort + Strain + Filter count) ── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#F5F5F5] border border-gray-200 rounded-full pl-4 pr-9 py-2 text-xs font-display text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/30 cursor-pointer"
              >
                <option value="featured">FEATURED</option>
                <option value="price-low">PRICE: LOW → HIGH</option>
                <option value="price-high">PRICE: HIGH → LOW</option>
                <option value="name">NAME: A → Z</option>
                {showGradeSort && <option value="grade">GRADE: BEST FIRST</option>}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Strain quick-filters — inline pill buttons */}
            {selectedCategory !== 'accessories' && (
              <div className="flex items-center gap-1.5">
                {['Indica', 'Sativa', 'Hybrid'].map(strain => (
                  <button
                    key={strain}
                    onClick={() => setSelectedStrain(selectedStrain === strain ? '' : strain)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-display transition-all ${
                      selectedStrain === strain
                        ? 'bg-[#4B2D8E] text-white'
                        : 'bg-[#F5F5F5] text-gray-500 hover:bg-[#4B2D8E]/10'
                    }`}
                  >
                    {strain.toUpperCase()}
                  </button>
                ))}
                {selectedStrain && (
                  <button
                    onClick={() => setSelectedStrain('')}
                    className="text-[10px] text-[#F15929] font-display hover:underline ml-1"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            )}

            {/* Product count */}
            <span className="text-xs text-gray-400 font-body ml-auto">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Mix-and-match note for ounce deals / shake */}
          {(selectedCategory === 'ounce-deals' || selectedCategory === 'shake-n-bake') && (
            <div className="bg-[#4B2D8E]/5 border border-[#4B2D8E]/10 rounded-xl p-3 mb-5 text-center">
              <p className="text-sm font-body text-[#4B2D8E]">*Mix and match available within same category/pricing</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader className="animate-spin text-[#4B2D8E]" size={32} />
            </div>
          )}

          {/* Products Grid — full width, no sidebar */}
          {!isLoading && (
            <>
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 font-body text-lg mb-2">No products found.</p>
                  <p className="text-gray-400 font-body text-sm">Try selecting a different category or clearing your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((product) => (
                    <div key={product.id}
                      className="bg-white rounded-2xl overflow-hidden group hover:shadow-2xl transition-all border border-gray-100">
                      <Link href={`/product/${product.slug}`} className="block">
                        <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                          <img src={product.image || 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b74?w=400'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="400" height="400" />
                          {/* Top-left badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {product.isNew && (
                              <span className="bg-[#F15929] text-white font-display text-[10px] px-3 py-1 rounded-full">NEW</span>
                            )}
                            {(product as any).grade && (
                              <span className={`font-display text-[10px] px-2.5 py-1 rounded-full ${GRADE_COLORS[(product as any).grade] || 'bg-gray-400 text-white'}`}>
                                {(product as any).grade}
                              </span>
                            )}
                          </div>
                          {/* Top-right strain tag */}
                          <span className="absolute top-3 right-3 bg-[#4B2D8E] text-white font-mono text-xs px-2 py-1 rounded-full">{product.strainType}</span>
                        </div>
                      </Link>
                      <div className="p-4">
                        <Link href={`/product/${product.slug}`}>
                          <h3 className="font-display text-sm text-[#4B2D8E] mb-1 hover:text-[#F15929] transition-colors">{product.name.toUpperCase()}</h3>
                        </Link>
                        <p className="text-xs text-gray-500 font-body mb-1">{product.flavor} · {product.weight}</p>
                        <p className="text-xs text-gray-400 font-mono mb-3">THC: {product.thc}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg text-[#4B2D8E]">${parseFloat(product.price.toString()).toFixed(2)}</span>
                          <button onClick={(e) => { e.preventDefault(); addItem({ ...product, id: String(product.id), categorySlug: product.category, strainType: product.strainType || 'N/A', price: parseFloat(product.price.toString()), inStock: product.stock > 0, rating: 4.5, reviewCount: 0, images: product.images || [], image: product.image || '', description: product.description || '', shortDescription: product.shortDescription || '', flavor: product.flavor || '', weight: product.weight || '' } as any); toast.success(`${product.name} added to cart`); }}
                            className="bg-[#F15929] hover:bg-[#d94d22] text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                            aria-label={`Add ${product.name} to cart`}>
                            <ShoppingCart size={16} />
                          </button>
                        </div>
                        <p className="text-[10px] text-[#4B2D8E] font-body mt-2 flex items-center gap-1">
                          <Star size={10} className="text-[#F15929]" /> Earn {parseFloat(product.price.toString()).toFixed(0)} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
