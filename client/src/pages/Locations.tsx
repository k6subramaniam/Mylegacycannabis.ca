import SEOHead from '@/components/SEOHead';
import { Breadcrumbs, WaveDivider } from '@/components/Layout';
import { storeLocations } from '@/lib/data';
import { MapPin, Phone, Clock, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-locations-2eTfMvHXR9EvDXMXwCxHwg.webp';
function LocationCard({ loc }: { loc: typeof storeLocations[0] }) {
  return (
    <article
      className="bg-[#F5F5F5] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all h-full"
      itemScope
      itemType="https://schema.org/LocalBusiness"
    >
      {/* Map embed */}
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
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-lg md:text-xl text-[#4B2D8E]" itemProp="name">
              MY LEGACY — {loc.name.toUpperCase()}
            </h2>
            <p
              className="text-sm text-gray-600 font-body mt-1"
              itemProp="address"
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              <span itemProp="streetAddress">{loc.address}</span>,{' '}
              <span itemProp="addressLocality">{loc.city}</span>,{' '}
              <span itemProp="addressRegion">{loc.province}</span>{' '}
              <span itemProp="postalCode">{loc.postalCode}</span>
            </p>
          </div>
          <div className="bg-[#F15929] text-white font-display text-xs px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1">
            <Clock size={12} /> 24/7
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <a
            href={`tel:${loc.phone.replace(/\D/g, '')}`}
            className="flex items-center gap-1.5 text-sm text-[#4B2D8E] hover:text-[#F15929] font-body transition-colors"
            itemProp="telephone"
          >
            <Phone size={14} /> {loc.phone}
          </a>
        </div>

        <div className="flex gap-3">
          <a
            href={`tel:${loc.phone.replace(/\D/g, '')}`}
            className="flex-1 bg-[#4B2D8E] hover:bg-[#3a2270] text-white text-center font-display text-sm py-3 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <Phone size={16} /> CALL NOW
          </a>
          <a
            href={loc.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#F15929] hover:bg-[#d94d22] text-white text-center font-display text-sm py-3 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <Navigation size={16} /> DIRECTIONS
          </a>
        </div>

        <meta itemProp="openingHours" content="Mo-Su 00:00-23:59" />
      </div>
    </article>
  );
}

export default function Locations() {
  const { t } = useT();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    skipSnaps: false,
    containScroll: 'trimSnaps',
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 2 },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <>
      <SEOHead
        title="Store Locations — 24/7 Cannabis Dispensary"
        description="Visit any of our 5 My Legacy Cannabis locations across the GTA and Ottawa. Open 24/7. Mississauga, Hamilton, Queen St Toronto, Dundas Toronto, and Merivale Ottawa."
        canonical="https://mylegacycannabisca-production.up.railway.app/locations"
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="My Legacy Cannabis store locations"
            className="w-full h-full object-cover opacity-30"
            loading="eager"
            width="1440"
            height="400"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[#4B2D8E]/70" />
        </div>
        <div className="container relative z-10 py-6 md:py-10">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Locations' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white mb-3">{t.locationsPage.title}</h1>
          <p className="text-white/70 font-body max-w-lg">
            {t.locationsPage.subtitle}
          </p>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* Locations Carousel */}
      <section className="bg-white py-6 md:py-10 -mt-1">
        <div className="container">
          {/* Header with navigation arrows */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-[#4B2D8E]">{t.locationsPage.findAStore}</h2>
              <p className="text-gray-500 font-body text-sm mt-1">
                {t.locationsPage.swipeToBrowse}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#4B2D8E] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3a2270] transition-colors shadow-lg"
                aria-label="Previous location"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F15929] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d94d22] transition-colors shadow-lg"
                aria-label="Next location"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Embla Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4 md:gap-6">
              {storeLocations.map((loc, i) => (
                <div
                  key={loc.id}
                  className="flex-[0_0_85%] sm:flex-[0_0_70%] md:flex-[0_0_48%] lg:flex-[0_0_48%]"
                >
                  <LocationCard loc={loc} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {storeLocations.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === selectedIndex
                    ? 'w-8 bg-[#F15929]'
                    : 'w-2.5 bg-[#4B2D8E]/25 hover:bg-[#4B2D8E]/50'
                }`}
                aria-label={`Go to location ${i + 1}`}
              />
            ))}
          </div>

          {/* Counter text */}
          <p className="text-center text-sm text-gray-400 font-body mt-3">
            {selectedIndex + 1} of {storeLocations.length} locations
          </p>
        </div>
      </section>

      {/* JSON-LD: one LocalBusiness per location — rich schema for Google Knowledge Panel */}
      {storeLocations.map((loc) => (
        <script
          key={loc.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              '@id': `https://mylegacycannabisca-production.up.railway.app/locations#${loc.id}`,
              name: `My Legacy Cannabis — ${loc.name}`,
              image: [
                'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/myLegacy-logo_1c4faece.png',
                'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-main-nBCmJTxSfhqeiDs3Vxut62.webp',
              ],
              url: 'https://mylegacycannabisca-production.up.railway.app/locations',
              telephone: loc.phone,
              email: 'support@mylegacycannabis.ca',
              priceRange: '$$',
              currenciesAccepted: 'CAD',
              paymentAccepted: 'Cash, Credit Card, Debit Card, E-Transfer',
              address: {
                '@type': 'PostalAddress',
                streetAddress: loc.address,
                addressLocality: loc.city,
                addressRegion: loc.province,
                postalCode: loc.postalCode,
                addressCountry: 'CA',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: loc.lat,
                longitude: loc.lng,
              },
              hasMap: loc.directionsUrl,
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: [
                    'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                    'Friday', 'Saturday', 'Sunday',
                  ],
                  opens: '00:00',
                  closes: '23:59',
                },
              ],
              servesCuisine: undefined,
              areaServed: {
                '@type': 'City',
                name: loc.city,
              },
              parentOrganization: {
                '@type': 'Organization',
                '@id': 'https://mylegacycannabisca-production.up.railway.app/#organization',
                name: 'My Legacy Cannabis',
                url: 'https://mylegacycannabisca-production.up.railway.app',
              },
            }),
          }}
        />
      ))}
    </>
  );
}
