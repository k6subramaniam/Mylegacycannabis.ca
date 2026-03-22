import { Link, useParams, useSearch } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { categories } from '@/lib/data';
import { ShoppingCart, SlidersHorizontal, X, ChevronDown, Star, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-shop-5tiqFdCHUdeMeR3zPVXYu5.webp';

export default function Shop() {
  const params = useParams<{ category?: string }>();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const urlCategory = params.category || searchParams.get('category') || '';

  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedStrain, setSelectedStrain] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { addItem } = useCart();

  // Fetch products from backend
  const { data: productsData, isLoading } = trpc.store.products.useQuery({
    category: selectedCategory || undefined,
    limit: 100,
  });

  const products = Array.isArray(productsData?.data) ? productsData.data : [];

  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedStrain) result = result.filter(p => p.strainType === selectedStrain);
    switch (sortBy) {
      case 'price-low': result.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString())); break;
      case 'price-high': result.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString())); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }, [products, selectedStrain, sortBy]);

  const activeCat = categories.find(c => c.slug === selectedCategory);
  const pageTitle = activeCat ? `${activeCat.name} — Shop` : 'Shop All Products';

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }];
  if (activeCat) breadcrumbs.push({ label: activeCat.name, href: '' });

  return (
    <>
      <SEOHead title={pageTitle} description={activeCat ? activeCat.description : 'Browse our full selection of premium cannabis products — flower, pre-rolls, edibles, vapes, concentrates, and accessories. Free shipping on orders over $150.'} canonical={`https://mylegacycannabisca-production.up.railway.app/shop${selectedCategory ? '/' + selectedCategory : ''}`} />

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

      {/* Main Content */}
      <section className="bg-white py-8 md:py-12">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block lg:w-64 shrink-0`}>
              <div className="bg-[#F5F5F5] rounded-2xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6 lg:hidden">
                  <h3 className="font-display text-lg text-[#4B2D8E]">FILTERS</h3>
                  <button onClick={() => setFiltersOpen(false)} className="text-gray-500 hover:text-[#4B2D8E]">
                    <X size={20} />
                  </button>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h4 className="font-display text-sm text-[#4B2D8E] mb-3">CATEGORY</h4>
                  <div className="space-y-2">
                    <button onClick={() => setSelectedCategory('')} className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${!selectedCategory ? 'bg-[#4B2D8E] text-white' : 'text-gray-600 hover:bg-white'}`}>
                      All Products
                    </button>
                    {categories.map(cat => (
                      <button key={cat.slug} onClick={() => setSelectedCategory(cat.slug)} className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedCategory === cat.slug ? 'bg-[#4B2D8E] text-white' : 'text-gray-600 hover:bg-white'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strain Filter */}
                <div className="mb-6">
                  <h4 className="font-display text-sm text-[#4B2D8E] mb-3">STRAIN TYPE</h4>
                  <div className="space-y-2">
                    {['Sativa', 'Indica', 'Hybrid', 'CBD'].map(strain => (
                      <label key={strain} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="strain" value={strain} checked={selectedStrain === strain} onChange={() => setSelectedStrain(strain)} className="w-4 h-4" />
                        <span className="text-sm text-gray-600">{strain}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="strain" value="" checked={selectedStrain === ''} onChange={() => setSelectedStrain('')} className="w-4 h-4" />
                      <span className="text-sm text-gray-600">All Strains</span>
                    </label>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h4 className="font-display text-sm text-[#4B2D8E] mb-3">SORT BY</h4>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]">
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Mobile Filter Toggle */}
              <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden mb-6 flex items-center gap-2 bg-[#F5F5F5] px-4 py-2.5 rounded-full text-[#4B2D8E] font-display text-sm hover:bg-gray-200 transition-colors">
                <SlidersHorizontal size={16} />
                FILTERS
              </button>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader className="animate-spin text-[#4B2D8E]" size={32} />
                </div>
              )}

              {/* Products */}
              {!isLoading && (
                <>
                  {filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 font-body">No products found. Try adjusting your filters.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((product, i) => (
                        <div key={product.id}
                          className="bg-white rounded-2xl overflow-hidden group hover:shadow-2xl transition-all">
                          <Link href={`/product/${product.slug}`} className="block">
                            <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                              <img src={product.image || 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b74?w=400'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="400" height="400" />
                              {product.isNew && (
                                <span className="absolute top-3 left-3 bg-[#F15929] text-white font-display text-[10px] px-3 py-1 rounded-full">NEW</span>
                              )}
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
          </div>
        </div>
      </section>
    </>
  );
}
