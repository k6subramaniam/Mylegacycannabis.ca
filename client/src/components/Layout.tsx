import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { storeLocations } from '@/lib/data';
import { Menu, X, ShoppingCart, Home, Search, User, Phone, Mail, Gift, ChevronRight, ChevronLeft, Truck, Wrench, Clock, Navigation, Globe, Star } from 'lucide-react';
import { useT } from '@/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { useBehavior } from '@/contexts/BehaviorContext';

const LOGO_URL_FALLBACK = '/logo.webp';

// ─── Header heights (must match <main> padding-top) ──────────────────────────
// Mobile:  nav h-16 (64px) + banner 32px = 96px  → mt-24 (96px)
// Desktop: nav h-20 (80px) + banner 32px = 112px → mt-28 (112px)
// These are exported so Layout's <main> and any page hero can use the same value.
export const HEADER_HEIGHT_MOBILE = 96;   // px
export const HEADER_HEIGHT_DESKTOP = 112; // px

// ============================================================
// AGE GATE — no animation, instant render, fixed full-screen
// ============================================================
function AgeGate({ onConfirm, logoUrl }: { onConfirm: () => void; logoUrl: string }) {
  const { t } = useT();
  useEffect(() => {
    // Lock scroll while gate is visible — prevents scrollbar CLS
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    // position:fixed + inset-0 ensures zero layout impact on the document flow
    <div
      className="fixed inset-0 z-[200] bg-[#4B2D8E] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Age verification"
    >
      {/* Card: fixed max-w so it never causes reflow */}
      <div className="bg-white rounded-2xl p-8 w-full max-w-[400px] text-center shadow-2xl">
        {/* Logo: 512×286 WebP, displayed at h-16 (64px) */}
        <img
          src={logoUrl}
          alt="My Legacy Cannabis"
          width="512"
          height="286"
          className="h-16 w-auto mx-auto mb-6"
          loading="eager"
          decoding="async"
        />
        <h2 className="font-display text-2xl text-[#4B2D8E] mb-4">{t.ageGate.welcome}<br />{t.ageGate.myLegacy}</h2>
        <p className="text-[#333] mb-6 font-body text-sm leading-relaxed">
          {t.ageGate.confirm}
        </p>
        <button
          onClick={onConfirm}
          className="w-full bg-[#F15929] hover:bg-[#d94d22] text-white font-display text-lg py-4 px-8 rounded-full transition-colors"
        >
          {t.ageGate.iAmOlder}
        </button>
        <button
          onClick={() => { window.location.href = 'https://www.google.com'; }}
          className="mt-4 text-gray-400 hover:text-gray-600 font-body text-sm transition-colors cursor-pointer bg-transparent border-none w-full"
        >
          {t.ageGate.underAge}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAINTENANCE MODE OVERLAY
// ============================================================
function MaintenanceLocationCard({ loc }: { loc: typeof storeLocations[0] }) {
  return (
    <article className="bg-[#F5F5F5] rounded-2xl overflow-hidden shadow-md h-full">
      {/* Google Maps embed */}
      <div className="aspect-video bg-gray-200">
        <iframe
          src={loc.mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of My Legacy Cannabis ${loc.name}`}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-display text-sm md:text-base text-[#4B2D8E] truncate">
              MY LEGACY — {loc.name.toUpperCase()}
            </h3>
            <p className="text-xs text-gray-600 font-body mt-0.5 truncate">
              {loc.address}, {loc.city}, {loc.province}
            </p>
          </div>
          <div className="bg-[#F15929] text-white font-display text-[10px] px-2 py-1 rounded-full shrink-0 flex items-center gap-0.5">
            <Clock size={10} /> 24/7
          </div>
        </div>

        <a
          href={`tel:${loc.phone.replace(/\D/g, '')}`}
          className="flex items-center gap-1 text-xs text-[#4B2D8E] hover:text-[#F15929] font-body transition-colors mb-3"
        >
          <Phone size={12} /> {loc.phone}
        </a>

        <div className="flex gap-2">
          <a
            href={`tel:${loc.phone.replace(/\D/g, '')}`}
            className="flex-1 bg-[#4B2D8E] hover:bg-[#3a2270] text-white text-center font-display text-xs py-2.5 rounded-full transition-colors flex items-center justify-center gap-1"
          >
            <Phone size={13} /> CALL NOW
          </a>
          <a
            href={loc.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#F15929] hover:bg-[#d94d22] text-white text-center font-display text-xs py-2.5 rounded-full transition-colors flex items-center justify-center gap-1"
          >
            <Navigation size={13} /> DIRECTIONS
          </a>
        </div>
      </div>
    </article>
  );
}

function MaintenanceOverlay({ title, message, logoUrl }: { title: string; message: string; logoUrl: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Embla carousel with auto-scroll ──
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: true,
    skipSnaps: false,
    containScroll: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Auto-scroll every 4 seconds
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      if (emblaApi) emblaApi.scrollNext();
    }, 4000);
  }, [emblaApi]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null; }
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    // Pause auto-scroll on pointer interaction, resume on release
    emblaApi.on('pointerDown', stopAutoplay);
    emblaApi.on('pointerUp', startAutoplay);
    startAutoplay();
    return () => {
      stopAutoplay();
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('pointerDown', stopAutoplay);
      emblaApi.off('pointerUp', startAutoplay);
    };
  }, [emblaApi, onSelect, startAutoplay, stopAutoplay]);

  return (
    <div
      className="fixed inset-0 z-[199] bg-[#4B2D8E] overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-label="Maintenance mode"
    >
      <div className="min-h-full flex flex-col items-center justify-start py-6 px-4">
        {/* ── Logo (large & prominent) ── */}
        <img
          src={logoUrl || LOGO_URL_FALLBACK}
          alt="My Legacy Cannabis"
          width="512"
          height="286"
          className="h-14 sm:h-16 md:h-20 w-auto mb-6"
          loading="eager"
          decoding="async"
        />

        {/* ── Maintenance card ── */}
        <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-[520px] text-center shadow-2xl mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#F15929]/10 flex items-center justify-center mx-auto mb-4">
            <Wrench size={32} className="text-[#F15929]" />
          </div>
          <h2 className="font-display text-xl md:text-2xl text-[#4B2D8E] mb-3 uppercase">
            {title || "WE'LL BE RIGHT BACK"}
          </h2>
          <p className="text-[#333] mb-5 font-body text-sm leading-relaxed whitespace-pre-wrap max-w-md mx-auto">
            {message || "Our store is currently undergoing maintenance. Please check back soon!"}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400 font-body">
            <a href="mailto:support@mylegacycannabis.ca" className="hover:text-[#4B2D8E] transition-colors flex items-center gap-1.5">
              <Mail size={14} /> Email Us
            </a>
            <a href="tel:4372154722" className="hover:text-[#4B2D8E] transition-colors flex items-center gap-1.5">
              <Phone size={14} /> (437) 215-4722
            </a>
          </div>
        </div>

        {/* ── Locations carousel ── */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <h3 className="font-display text-lg md:text-xl text-white">VISIT US IN PERSON</h3>
              <p className="text-white/60 font-body text-xs md:text-sm mt-0.5">
                5 locations across the GTA &amp; Ottawa — open 24/7
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { scrollPrev(); stopAutoplay(); startAutoplay(); }}
                disabled={!canScrollPrev}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/20 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
                aria-label="Previous location"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => { scrollNext(); stopAutoplay(); startAutoplay(); }}
                disabled={!canScrollNext}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#F15929] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d94d22] transition-colors"
                aria-label="Next location"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Embla viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-5 md:gap-6">
              {storeLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex-[0_0_85%] sm:flex-[0_0_65%] md:flex-[0_0_46%] lg:flex-[0_0_36%]"
                >
                  <MaintenanceLocationCard loc={loc} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {storeLocations.map((_, i) => (
              <button
                key={i}
                onClick={() => { scrollTo(i); stopAutoplay(); startAutoplay(); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === selectedIndex
                    ? 'w-6 bg-[#F15929]'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to location ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-white/40 font-body mt-2">
            {selectedIndex + 1} of {storeLocations.length} locations
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STORE HOURS WIDGET — used in Footer
// ============================================================
const DAY_LABELS_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function StoreHoursWidget() {
  const { storeHours } = useSiteConfig();

  if (!storeHours.enabled || !storeHours.hours) return null;

  const hours = storeHours.hours;
  const today = DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div>
      <h3 className="font-display text-lg mb-4 text-[#F15929]">STORE HOURS</h3>
      <ul className="space-y-1.5 font-body text-sm">
        {DAYS_ORDER.map(day => {
          const d = hours[day];
          if (!d) return null;
          const isToday = day === today;
          return (
            <li key={day} className={`flex items-center justify-between ${isToday ? 'text-[#F15929] font-semibold' : 'text-white/70'}`}>
              <span className="flex items-center gap-1.5">
                {isToday && <Clock size={12} />}
                {DAY_LABELS_SHORT[day]}
              </span>
              <span>
                {d.closed
                  ? 'Closed'
                  : `${formatTime12(d.open)} - ${formatTime12(d.close)}`
                }
              </span>
            </li>
          );
        })}
      </ul>
      {storeHours.note && (
        <p className="text-white/50 text-xs mt-3 leading-relaxed">{storeHours.note}</p>
      )}
    </div>
  );
}

// ============================================================
// HEADER — fixed height so <main> offset never shifts
// ============================================================
function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const { t, locale, setLocale } = useT();
  const { logoUrl, bannerMessages: customBannerMessages } = useSiteConfig();

  // Use admin-configured banner messages if set, otherwise fall back to i18n defaults
  const bannerMessages = (customBannerMessages && customBannerMessages.length > 0)
    ? customBannerMessages
    : t.header.bannerMessages;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const navLinks = [
    { href: '/', label: t.common.home },
    { href: '/shop', label: t.common.shop },
    { href: '/rewards', label: t.common.rewards },
    { href: '/locations', label: t.common.locations },
    { href: '/about', label: t.common.aboutUs },
    { href: '/shipping', label: t.common.shipping },
    { href: '/contact', label: t.common.contact },
    { href: '/faq', label: t.common.faq },
  ];

  return (
    <>
      {/*
        Header total height:
          mobile: h-16 (64px) nav + 32px banner = 96px  → matches mt-24 on <main>
          desktop: h-20 (80px) nav + 32px banner = 112px → matches mt-28 on <main>
        Both rows use explicit min-h to prevent font-load reflow.
      */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled ? 'bg-[#4B2D8E]/95 backdrop-blur-md shadow-lg' : 'bg-[#4B2D8E]'
        }`}
        style={{ contain: 'layout' }}
      >
        {/* Nav row: explicit h prevents resize when logo loads */}
        <div className="container flex items-center justify-between h-16 md:h-20 overflow-visible">
          <Link href="/" aria-label="My Legacy Cannabis Home">
            {/* Logo: 512×286 WebP, displayed at h-10 (40px) mobile / h-14 (56px) desktop */}
            <img
              src={logoUrl || LOGO_URL_FALLBACK}
              alt="My Legacy Cannabis"
              width="512"
              height="286"
              className="h-120 md:h-168 w-auto relative z-10"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#F15929] ${
                  location === link.href ? 'text-[#F15929]' : 'text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative text-white hover:text-[#F15929] transition-colors p-2"
              aria-label={`Shopping cart, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#F15929] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            {/* Rewards points badge — visible when logged in */}
            {isAuthenticated && user && (
              <Link
                href="/rewards"
                className="hidden sm:flex items-center gap-1.5 bg-[#F15929]/20 hover:bg-[#F15929]/30 text-white px-3 py-1.5 rounded-full transition-colors"
                aria-label={`${user.rewardsPoints?.toLocaleString() || 0} reward points`}
                title="My Legacy Rewards"
              >
                <Star size={14} className="text-[#F15929] fill-[#F15929]" />
                <span className="text-xs font-display font-bold">{user.rewardsPoints?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-white/70 font-body hidden md:inline">pts</span>
              </Link>
            )}
            {/* Language Toggle */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}
              className="text-white hover:text-[#F15929] transition-colors p-2 flex items-center gap-1"
              aria-label={t.lang.tooltip}
              title={t.lang.tooltip}
            >
              <Globe size={18} />
              <span className="text-xs font-display">{t.lang.switchTo}</span>
            </button>
            <Link
              href={isAuthenticated ? '/account' : '/account/login'}
              className="hidden md:block text-white hover:text-[#F15929] transition-colors p-2"
              aria-label={t.common.account}
            >
              <User size={22} />
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden text-white p-2"
              aria-label={t.header.openMenu}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Shipping banner: scrolling marquee, explicit h-8 (32px) so height never shifts */}
        <div className="h-8 bg-[#F15929] text-white overflow-hidden relative" aria-label="Promotional announcements">
          <div className="marquee-track flex items-center h-full">
            {/* Duplicate the message set twice for seamless infinite loop */}
            {[0, 1].map(setIndex => (
              <div key={setIndex} className="marquee-content flex items-center shrink-0" aria-hidden={setIndex === 1 ? 'true' : undefined}>
                {bannerMessages.map((msg: string, i: number) => (
                  <span key={`${setIndex}-${i}`} className="flex items-center whitespace-nowrap text-xs md:text-sm font-medium font-body mx-8">
                    <Truck size={14} className="inline-block shrink-0 mr-1.5" />
                    {msg}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu — triggered by user, not CLS source */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-[70] overflow-y-auto"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between p-4 border-b h-16">
                <img
                  src={logoUrl || LOGO_URL_FALLBACK}
                  alt="My Legacy Cannabis"
                  width="512"
                  height="286"
                  className="h-10 w-auto"
                  loading="eager"
                  decoding="async"
                />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-[#333] p-2"
                  aria-label="Close navigation menu"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center justify-between py-3 px-4 rounded-lg text-lg font-display transition-colors ${
                        location === link.href ? 'bg-[#4B2D8E] text-white' : 'text-[#333] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {link.label}
                      <ChevronRight size={18} />
                    </Link>
                  </motion.div>
                ))}
                <div className="pt-4 border-t mt-4">
                  <Link
                    href={isAuthenticated ? '/account' : '/account/login'}
                    className="flex items-center gap-3 py-3 px-4 rounded-lg text-lg font-display text-[#333] hover:bg-[#F5F5F5]"
                  >
                    <User size={20} /> {isAuthenticated ? t.common.myAccount : t.common.signIn}
                  </Link>
                  <Link
                    href="/rewards"
                    className="flex items-center gap-3 py-3 px-4 rounded-lg text-lg font-display text-[#F15929] hover:bg-[#F5F5F5]"
                  >
                    <Gift size={20} />
                    <span className="flex-1">{t.common.myRewards}</span>
                    {isAuthenticated && user?.rewardsPoints != null && (
                      <span className="bg-[#F15929]/10 text-[#F15929] text-xs font-bold px-2 py-0.5 rounded-full">
                        {user.rewardsPoints.toLocaleString()} pts
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  const { t } = useT();
  const { logoUrl, storeHours } = useSiteConfig();
  const showStoreHours = storeHours.enabled && !!storeHours.hours;
  return (
    <footer className="bg-[#4B2D8E] text-white pb-24 md:pb-8" style={{ minHeight: 480, contain: 'layout style', contentVisibility: 'auto', containIntrinsicSize: 'auto 480px' }}>
      <div className="container py-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${showStoreHours ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-8`}>
          {/* Brand */}
          <div>
            {/* Explicit width/height prevents layout shift when image loads */}
            <img
              src={logoUrl || LOGO_URL_FALLBACK}
              alt="My Legacy Cannabis"
              width="512"
              height="286"
              className="h-14 w-auto mb-4"
              loading="lazy"
              decoding="async"
            />
            <p className="text-white/70 text-sm font-body leading-relaxed">
              {t.footer.brand}
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#F15929] transition-colors"
                aria-label="My Legacy Cannabis on Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg mb-4 text-[#F15929]">{t.footer.quickLinks}</h3>
            <ul className="space-y-2 font-body text-sm">
              {[['/', t.common.home], ['/shop', t.footer.shopAll], ['/rewards', t.footer.rewardsProgram], ['/locations', t.footer.storeLocations], ['/about', t.common.aboutUs], ['/faq', t.common.faq]].map(([href, label]) => (
                <li key={href}><Link href={href} className="text-white/70 hover:text-[#F15929] transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display text-lg mb-4 text-[#F15929]">{t.footer.categories}</h3>
            <ul className="space-y-2 font-body text-sm">
              {[
                { label: t.footer.flower,       slug: 'flower' },
                { label: t.footer.preRolls,    slug: 'pre-rolls' },
                { label: t.footer.edibles,      slug: 'edibles' },
                { label: t.footer.vapes,        slug: 'vapes' },
                { label: t.footer.concentrates, slug: 'concentrates' },
                { label: t.footer.ounceDeals,   slug: 'ounce-deals' },
                { label: t.footer.shakeNBake,   slug: 'shake-n-bake' },
                { label: t.footer.accessories,  slug: 'accessories' },
              ].map(cat => (
                <li key={cat.slug}>
                  <Link href={`/shop/${cat.slug}`} className="text-white/70 hover:text-[#F15929] transition-colors">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Store Hours (from admin settings) — only shown when enabled */}
          {showStoreHours && (
            <div>
              <StoreHoursWidget />
            </div>
          )}

          {/* Get In Touch */}
          <div>
            <h3 className="font-display text-lg mb-4 text-[#F15929]">{t.footer.getInTouch}</h3>
            <ul className="space-y-3 font-body text-sm">
              <li>
                <a href="tel:4372154722" className="flex items-center gap-2 text-white/70 hover:text-[#F15929] transition-colors">
                  <Phone size={16} className="shrink-0 text-[#F15929]" /> (437) 215-4722
                </a>
              </li>
              <li>
                <a href="mailto:support@mylegacycannabis.ca" className="flex items-center gap-2 text-white/70 hover:text-[#F15929] transition-colors">
                  <Mail size={16} className="shrink-0 text-[#F15929]" /> support@mylegacycannabis.ca
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/50 font-body">
          <p>&copy; {new Date().getFullYear()} My Legacy Cannabis. {t.common.allRightsReserved}</p>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">{t.common.privacyPolicy}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t.common.terms}</Link>
            <Link href="/shipping" className="hover:text-white transition-colors">{t.common.shippingPolicy}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// MOBILE BOTTOM NAV
// ============================================================
function MobileBottomNav() {
  const [location] = useLocation();
  const { itemCount } = useCart();
  const { isAuthenticated } = useAuth();
  const { t } = useT();

  const tabs = [
    { href: '/', icon: Home, label: t.common.home },
    { href: '/shop', icon: Search, label: t.common.shop },
    { href: '/rewards', icon: Gift, label: t.common.rewards },
    { href: '/cart', icon: ShoppingCart, label: t.common.cart, badge: itemCount },
    { href: isAuthenticated ? '/account' : '/account/login', icon: User, label: t.common.account },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-bottom"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive =
            location === tab.href ||
            (tab.href === '/shop' && location.startsWith('/shop')) ||
            (tab.href === '/account' && location.startsWith('/account'));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full relative transition-colors ${
                isActive ? 'text-[#4B2D8E]' : 'text-gray-400'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                <tab.icon size={20} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#F15929] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4B2D8E] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// BREADCRUMBS
// ============================================================
export function Breadcrumbs({
  items,
  variant = 'light',
}: {
  items: { label: string; href?: string }[];
  variant?: 'light' | 'dark';
}) {
  const isOnDark = variant === 'dark';
  return (
    <nav aria-label="Breadcrumb" className="py-2 text-sm font-body">
      <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-1.5"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {item.href ? (
              <Link
                href={item.href}
                className={`${isOnDark ? 'text-white/80 hover:text-white' : 'text-[#4B2D8E] hover:text-[#F15929]'} transition-colors`}
                itemProp="item"
              >
                <span itemProp="name">{item.label}</span>
              </Link>
            ) : (
              <span className={isOnDark ? 'text-white' : 'text-gray-500'} itemProp="name">
                {item.label}
              </span>
            )}
            <meta itemProp="position" content={String(i + 1)} />
            {i < items.length - 1 && (
              <ChevronRight size={14} className={isOnDark ? 'text-white/50' : 'text-gray-400'} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ============================================================
// WAVE DIVIDER
// ============================================================
export function WaveDivider({
  color = '#4B2D8E',
  flip = false,
  className = '',
}: {
  color?: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <div className={`wave-divider ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '40px' }}
      >
        <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill={color} />
      </svg>
    </div>
  );
}

// ============================================================
// MAIN LAYOUT
// ============================================================
export default function Layout({ children }: { children: React.ReactNode }) {
  const [ageVerified, setAgeVerified] = useState(() => {
    try { return localStorage.getItem('mlc-age-verified') === 'true'; } catch { return false; }
  });
  const { maintenance, logoUrl } = useSiteConfig();
  const [location] = useLocation();
  const { trackPageView } = useBehavior();

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location);
  }, [location, trackPageView]);

  const handleAgeConfirm = () => {
    setAgeVerified(true);
    try { localStorage.setItem('mlc-age-verified', 'true'); } catch {}
  };

  return (
    <>
      {/* AgeGate is position:fixed — zero impact on document flow / CLS */}
      {!ageVerified && <AgeGate onConfirm={handleAgeConfirm} logoUrl={logoUrl} />}

      {/* Maintenance overlay — shown after age gate, blocks entire storefront */}
      {ageVerified && maintenance.enabled && (
        <MaintenanceOverlay title={maintenance.title} message={maintenance.message} logoUrl={logoUrl} />
      )}

      <div className="min-h-screen flex flex-col">
        <Header />
        {/*
          pt-24 = 96px  (mobile:  h-16 nav + h-8 banner)
          md:pt-28 = 112px (desktop: h-20 nav + h-8 banner)
          Hard pixel values — no calc(), no font-dependent units — prevents reflow.
        */}
        <main className="flex-1 pt-24 md:pt-28">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </>
  );
}
