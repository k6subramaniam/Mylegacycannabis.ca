import SEOHead from "@/components/SEOHead";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import {
  categories,
  storeLocations as fallbackLocations,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/data";
import {
  ROUTE_SEO,
  canonical,
  buildBreadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo-config";
import { WaveDivider } from "@/components/Layout";
import {
  ShoppingCart,
  MapPin,
  Phone,
  Clock,
  Truck,
  Shield,
  Star,
  Gift,
  ArrowRight,
  Leaf,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useT } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useBehavior } from "@/contexts/BehaviorContext";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-main-nBCmJTxSfhqeiDs3Vxut62.webp";

export default function Home() {
  const { addItem } = useCart();
  const { trackAddToCart } = useBehavior();
  const { t } = useT();
  const { data: featuredProducts } = trpc.store.featuredProducts.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const featured = featuredProducts ?? [];
  const { data: dbLocations } = trpc.store.locations.useQuery();
  const { idVerificationEnabled } = useSiteConfig();
  const storeLocations =
    dbLocations && dbLocations.length > 0 ? dbLocations : fallbackLocations;

  // Fetch real-time category counts from the database
  const { data: categoryCounts } = trpc.store.categoryCounts.useQuery(
    undefined,
    {
      staleTime: 60_000, // refresh every minute
    }
  );

  // Merge real counts into static category definitions
  const categoriesWithCounts = useMemo(() => {
    if (!categoryCounts) return categories;
    return categories.map(cat => ({
      ...cat,
      productCount: categoryCounts[cat.slug] ?? cat.productCount,
    }));
  }, [categoryCounts]);

  return (
    <>
      <SEOHead
        title={ROUTE_SEO["/"].title}
        description={ROUTE_SEO["/"].description}
        canonical={canonical("/")}
        ogImage="/logo.webp"
        jsonLd={buildBreadcrumbJsonLd([{ name: "Home", url: canonical("/") }])}
      />

      {/* HERO SECTION — pulled up to sit directly under the fixed header (no white gap) */}
      <section
        className="relative bg-[#4B2D8E] overflow-hidden"
        style={{
          marginTop: "calc(-1 * var(--header-h, 96px))",
          paddingTop: "var(--header-h, 96px)",
        }}
      >
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
            style={{ display: "block" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-8 md:py-12 lg:py-16">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#F15929] text-white font-display text-xs px-4 py-1.5 rounded-full mb-4">
              {t.home.heroTag}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-4">
              {t.home.heroTitle1}
              <br />
              <span className="text-[#F15929]">{t.home.heroTitle2}</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-body mb-8 max-w-xl leading-relaxed">
              {t.home.heroDesc1}
            </p>
            <p className="text-white/80 text-lg md:text-xl font-body mb-8 max-w-xl leading-relaxed">
              {t.home.heroDesc2}{" "}
              <strong className="text-[#F15929] font-display">
                {t.home.heroFreeShipping}
              </strong>
              .
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display text-base py-3.5 px-8 rounded-full transition-all hover:scale-105 active:scale-95"
              >
                {t.common.shopNow} <ArrowRight size={18} />
              </Link>
              <Link
                href="/locations"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-display text-base py-3.5 px-8 rounded-full transition-all border border-white/30"
              >
                {t.common.findAStore} <MapPin size={18} />
              </Link>
            </div>
          </div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* TRUST BADGES — static, no animation, immediately visible */}
      <section className="bg-white py-8 -mt-1">
        <div className="container">
          <div
            className={`grid grid-cols-2 ${idVerificationEnabled ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}
          >
            {[
              {
                icon: Truck,
                label: t.home.trustFreeShipping,
                sub: t.home.trustFreeShippingSub,
              },
              {
                icon: Clock,
                label: t.home.trustOpen247,
                sub: t.home.trustOpen247Sub,
              },
              ...(idVerificationEnabled
                ? [
                    {
                      icon: Shield,
                      label: t.home.trustAgeVerified,
                      sub: t.home.trustAgeVerifiedSub,
                    },
                  ]
                : []),
              {
                icon: Gift,
                label: t.home.trustEarnRewards,
                sub: t.home.trustEarnRewardsSub,
              },
            ].map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F5]"
              >
                <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                  <badge.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-display text-xs text-[#4B2D8E]">
                    {badge.label}
                  </p>
                  <p className="text-xs text-gray-500 font-body">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS — positioned before categories, styled like Shop/New Arrivals cards */}
      <section className="bg-[#F5F5F5] py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-[#4B2D8E] mb-3">
              {t.home.featuredProducts}
            </h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">
              {t.home.featuredProductsDesc}
            </p>
          </div>
          {featured.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#4B2D8E]" />
              <span className="ml-3 text-gray-500 font-body text-sm">
                Loading featured products...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((product: any) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden group hover:shadow-2xl transition-all border border-gray-100"
                >
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
                      {/* Top-left badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {product.isNew && (
                          <span className="bg-[#F19929] text-white font-display text-[10px] px-3 py-1 rounded-full">
                            NEW
                          </span>
                        )}
                        {product.featured && (
                          <span className="bg-[#4B2D8E] text-white font-display text-[10px] px-3 py-1 rounded-full flex items-center gap-1">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            STAFF PICK
                          </span>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="bg-red-500 text-white font-display text-[10px] px-3 py-1 rounded-full animate-pulse">
                            LOW STOCK
                          </span>
                        )}
                        {product.grade && (
                          <span className="bg-amber-500 text-white font-display text-[10px] px-2.5 py-1 rounded-full">
                            {product.grade}
                          </span>
                        )}
                      </div>
                      {/* Top-right strain type */}
                      {product.strainType && product.strainType !== "N/A" && (
                        <span className="absolute top-3 right-3 bg-[#4B2D8E] text-white font-mono-legacy text-[10px] px-2 py-1 rounded-full">
                          {product.strainType}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="font-display text-sm text-[#4B2D8E] mb-1 hover:text-[#F19929] transition-colors line-clamp-2">
                        {product.name.toUpperCase()}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-500 font-body mb-1">
                      {product.flavor && product.flavor !== product.grade
                        ? `${product.flavor} \u00B7 `
                        : ""}
                      {product.weight}
                    </p>
                    <p className="text-xs text-gray-400 font-mono-legacy mb-3">
                      THC: {product.thc}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg text-[#4B2D8E]">
                        $
                        {(typeof product.price === "string"
                          ? parseFloat(product.price)
                          : product.price
                        ).toFixed(2)}
                      </span>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          const cartProduct = {
                            ...product,
                            id: String(product.id),
                            categorySlug: product.category || "",
                            strainType: product.strainType || "N/A",
                            price: parseFloat(String(product.price || 0)),
                            inStock: product.stock > 0,
                            rating: 4.5,
                            reviewCount: 0,
                            images: product.images || [],
                            image: product.image || "",
                            description: product.description || "",
                            shortDescription: product.shortDescription || "",
                            flavor: product.flavor || "",
                            weight: product.weight || "",
                          } as any;
                          addItem(cartProduct);
                          trackAddToCart(product.slug, product.id, {
                            price: product.price,
                            name: product.name,
                          });
                          toast.success(`${product.name} added to cart`);
                        }}
                        className="bg-[#F19929] hover:bg-[#d98520] text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[#4B2D8E] font-body mt-2 flex items-center gap-1">
                      <Star size={10} className="text-[#F19929]" /> Earn{" "}
                      {Math.floor(
                        typeof product.price === "string"
                          ? parseFloat(product.price)
                          : product.price
                      )}{" "}
                      points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-8 rounded-full transition-all hover:scale-105"
            >
              {t.home.viewAllProducts} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORY GRID — static headings, lazy-loaded images below fold */}
      <section className="bg-white py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-[#4B2D8E] mb-3">
              {t.home.findYourLegacy}
            </h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">
              {t.home.findYourLegacyDesc}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categoriesWithCounts.map(cat => (
              <Link
                key={cat.slug}
                href={`/shop/${cat.slug}`}
                className="group block relative rounded-2xl overflow-hidden bg-[#F5F5F5] aspect-[4/3] hover:shadow-xl transition-all"
              >
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
                  <h3 className="font-display text-lg md:text-xl text-white">
                    {cat.name.toUpperCase()}
                  </h3>
                  <p className="text-white/70 text-xs font-body mt-1">
                    {cat.productCount} Products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SHIPPING BANNER — static, no opacity-0 initial state */}
      <section className="bg-[#F5F5F5] py-12 -mt-1">
        <div className="container">
          <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                <Truck size={28} className="text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="font-display text-2xl text-[#4B2D8E] mb-2">
                  {t.home.nationwideShipping}
                </h2>
                <p className="text-gray-600 font-body">
                  {t.home.nationwideShippingDesc}{" "}
                  <strong className="text-[#F15929]">
                    {t.home.freeShippingOver.replace(
                      "{threshold}",
                      String(FREE_SHIPPING_THRESHOLD)
                    )}
                  </strong>
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4 font-mono-legacy text-xs">
                  {[
                    ["ON", "$10"],
                    ["QC", "$12"],
                    ["West", "$15"],
                    ["Atlantic", "$18"],
                    ["North", "$25"],
                  ].map(([r, p]) => (
                    <span
                      key={r}
                      className="bg-[#F5F5F5] px-3 py-1.5 rounded-full text-[#333]"
                    >
                      {r}: {p}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/shipping"
                className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-6 rounded-full transition-all hover:scale-105 shrink-0"
              >
                SHIPPING DETAILS
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
                <h2 className="font-display text-2xl mb-2">
                  {t.home.myLegacyRewards}
                </h2>
                <p className="text-white/80 font-body">
                  {t.home.myLegacyRewardsDesc}
                </p>
              </div>
              <Link
                href="/rewards"
                className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-6 rounded-full transition-all hover:scale-105 shrink-0"
              >
                {t.common.joinNow}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="#ffffff" />

      {/* LOCATIONS — static grid, min-h prevents CLS while data loads */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-[#4B2D8E] mb-3">
              {t.home.ourLocations}
            </h2>
            <p className="text-gray-600 font-body max-w-lg mx-auto">
              {t.home.ourLocationsDesc}
            </p>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ minHeight: 240 }}
          >
            {storeLocations.slice(0, 3).map(loc => (
              <div
                key={loc.id}
                className="bg-[#F5F5F5] rounded-2xl p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-[#4B2D8E]">
                      {loc.name.toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600 font-body">
                      {loc.address}, {loc.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-body text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> 24/7
                  </span>
                  <a
                    href={`tel:${loc.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-1 text-[#F15929] hover:underline"
                  >
                    <Phone size={14} /> {loc.phone}
                  </a>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${loc.phone.replace(/\D/g, "")}`}
                    aria-label={`Call My Legacy Cannabis ${loc.name}`}
                    className="flex-1 bg-[#4B2D8E] text-white text-center font-display text-xs py-2.5 rounded-full hover:bg-[#3a2270] transition-colors"
                  >
                    CALL NOW
                  </a>
                  {loc.directionsUrl && (
                    <a
                      href={loc.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Get directions to My Legacy Cannabis ${loc.name}`}
                      className="flex-1 bg-[#F15929] text-white text-center font-display text-xs py-2.5 rounded-full hover:bg-[#d94d22] transition-colors"
                    >
                      DIRECTIONS
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/locations"
              className="text-[#4B2D8E] hover:text-[#F15929] font-display text-sm transition-colors inline-flex items-center gap-1"
            >
              {t.home.viewAllLocations} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER — fixed-height section prevents CLS */}
      <section
        className="bg-[#F15929] py-12 md:py-16"
        style={{ contain: "layout style" }}
      >
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Leaf size={32} className="text-white/50 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-white mb-3">
              {t.home.stayInTheLoop}
            </h2>
            <p className="text-white/80 font-body mb-6">
              {t.home.stayInTheLoopDesc}
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* Organization schema lives in index.html — no duplicate here */}
    </>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const { t } = useT();
  const subscribeMutation = trpc.subscribeNewsletter.useMutation({
    onSuccess: (data) => {
      if (data.isNew) {
        toast.success(t.home.thanksSubscribing || "Thanks for subscribing!");
        setEmail("");
      } else {
        toast.success("You're already subscribed! Stay tuned.");
        setEmail("");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to subscribe. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      subscribeMutation.mutate({ email, source: "homepage" });
    }
  };
  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t.home.enterEmail}
          className="w-full px-6 py-4 rounded-xl bg-[#F15929]/70 border border-white/30 text-white placeholder-white/50 font-mono-legacy text-base focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-[#F15929]/80 transition-all"
          required
          aria-label="Email address"
        />
        <button
          type="submit"
          className="mt-4 w-full bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3.5 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          {t.common.subscribe}
        </button>
      </div>
    </form>
  );
}
