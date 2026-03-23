import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, ShoppingCart, Home, Search, User, MapPin, Phone, Mail, Gift, ChevronRight, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png';

// ─── Header heights (must match <main> padding-top) ──────────────────────────
// Mobile:  nav h-16 (64px) + banner 32px = 96px  → mt-24 (96px)
// Desktop: nav h-20 (80px) + banner 32px = 112px → mt-28 (112px)
// These are exported so Layout's <main> and any page hero can use the same value.
export const HEADER_HEIGHT_MOBILE = 96;   // px
export const HEADER_HEIGHT_DESKTOP = 112; // px

// ============================================================
// AGE GATE — no animation, instant render, fixed full-screen
// ============================================================
function AgeGate({ onConfirm }: { onConfirm: () => void }) {
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
        {/* Explicit intrinsic size: logo is 240×64, displayed at h-16 (64px) */}
        <img
          src={LOGO_URL}
          alt="My Legacy Cannabis"
          width="240"
          height="64"
          className="h-16 w-auto mx-auto mb-6"
          loading="eager"
          decoding="sync"
        />
        <h2 className="font-display text-2xl text-[#4B2D8E] mb-4">WELCOME TO<br />MY LEGACY</h2>
        <p className="text-[#333] mb-6 font-body text-sm leading-relaxed">
          Please confirm you are of legal age (19+) in your province to view cannabis products.
        </p>
        <button
          onClick={onConfirm}
          className="w-full bg-[#F15929] hover:bg-[#d94d22] text-white font-display text-lg py-4 px-8 rounded-full transition-colors"
        >
          I AM 19 OR OLDER
        </button>
        <button
          onClick={() => { window.location.href = 'https://www.google.com'; }}
          className="mt-4 text-gray-400 hover:text-gray-600 font-body text-sm transition-colors cursor-pointer bg-transparent border-none w-full"
        >
          I am under 19 — Exit
        </button>
      </div>
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
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/rewards', label: 'Rewards' },
    { href: '/locations', label: 'Locations' },
    { href: '/about', label: 'About Us' },
    { href: '/shipping', label: 'Shipping' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
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
        <div className="container flex items-center justify-between h-16 md:h-20">
          <Link href="/" aria-label="My Legacy Cannabis Home">
            {/*
              Logo intrinsic: 240×64. On mobile we show h-10 (40px) → w=150px.
              On desktop h-14 (56px) → w=210px.
              We set width/height to the LARGEST display size to give browser
              correct aspect ratio; CSS clamps it to h-10/h-14.
            */}
            <img
              src={LOGO_URL}
              alt="My Legacy Cannabis"
              width="210"
              height="56"
              className="h-10 md:h-14 w-auto"
              loading="eager"
              decoding="sync"
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
            <Link
              href={isAuthenticated ? '/account' : '/account/login'}
              className="hidden md:block text-white hover:text-[#F15929] transition-colors p-2"
              aria-label="Account"
            >
              <User size={22} />
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden text-white p-2"
              aria-label="Open navigation menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Shipping banner: explicit h-8 (32px) so height never shifts */}
        <div className="h-8 bg-[#F15929] text-white flex items-center justify-center text-xs md:text-sm font-medium font-body whitespace-nowrap overflow-hidden">
          <Truck size={14} className="inline-block shrink-0 mr-1.5" />
          FREE Shipping on Orders Over $150 — Nationwide Delivery Across Canada
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
                  src={LOGO_URL}
                  alt="My Legacy Cannabis"
                  width="150"
                  height="40"
                  className="h-10 w-auto"
                  loading="eager"
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
                    <User size={20} /> {isAuthenticated ? 'My Account' : 'Sign In'}
                  </Link>
                  <Link
                    href="/rewards"
                    className="flex items-center gap-3 py-3 px-4 rounded-lg text-lg font-display text-[#F15929] hover:bg-[#F5F5F5]"
                  >
                    <Gift size={20} /> My Rewards
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
  return (
    <footer className="bg-[#4B2D8E] text-white pb-24 md:pb-8">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            {/* Explicit width/height prevents layout shift when image loads */}
            <img
              src={LOGO_URL}
              alt="My Legacy Cannabis"
              width="168"
              height="56"
              className="h-14 w-auto mb-4"
              loading="lazy"
            />
            <p className="text-white/70 text-sm font-body leading-relaxed">
              Your trusted 24/7 cannabis dispensary serving the Greater Toronto Area and Ottawa. Premium products, nationwide shipping.
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
            <h3 className="font-display text-lg mb-4 text-[#F15929]">QUICK LINKS</h3>
            <ul className="space-y-2 font-body text-sm">
              {[['/', 'Home'], ['/shop', 'Shop All'], ['/rewards', 'Rewards Program'], ['/locations', 'Store Locations'], ['/about', 'About Us'], ['/faq', 'FAQ']].map(([href, label]) => (
                <li key={href}><Link href={href} className="text-white/70 hover:text-[#F15929] transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display text-lg mb-4 text-[#F15929]">CATEGORIES</h3>
            <ul className="space-y-2 font-body text-sm">
              {[
                { label: 'Flower',       slug: 'flower' },
                { label: 'Pre-Rolls',    slug: 'pre-rolls' },
                { label: 'Edibles',      slug: 'edibles' },
                { label: 'Vapes',        slug: 'vapes' },
                { label: 'Concentrates', slug: 'concentrates' },
                { label: 'Accessories',  slug: 'accessories' },
              ].map(cat => (
                <li key={cat.slug}>
                  <Link href={`/shop/${cat.slug}`} className="text-white/70 hover:text-[#F15929] transition-colors">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg mb-4 text-[#F15929]">CONTACT US</h3>
            <ul className="space-y-3 font-body text-sm">
              <li className="flex items-start gap-2 text-white/70">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#F15929]" />
                <span>255 Dundas St W, Mississauga, ON</span>
              </li>
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
          <p>&copy; {new Date().getFullYear()} My Legacy Cannabis. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <Link href="/shipping" className="hover:text-white transition-colors">Shipping Policy</Link>
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

  const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/shop', icon: Search, label: 'Shop' },
    { href: '/rewards', icon: Gift, label: 'Rewards' },
    { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
    { href: isAuthenticated ? '/account' : '/account/login', icon: User, label: 'Account' },
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

  const handleAgeConfirm = () => {
    setAgeVerified(true);
    try { localStorage.setItem('mlc-age-verified', 'true'); } catch {}
  };

  return (
    <>
      {/* AgeGate is position:fixed — zero impact on document flow / CLS */}
      {!ageVerified && <AgeGate onConfirm={handleAgeConfirm} />}

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
