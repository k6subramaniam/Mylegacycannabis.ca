import SEOHead from "@/components/SEOHead";
import { Breadcrumbs, WaveDivider } from "@/components/Layout";
import { ROUTE_SEO, canonical, buildBreadcrumbJsonLd } from "@/lib/seo-config";
import { Link } from "wouter";
import { MapPin, Shield, Heart, Leaf, Award, ArrowRight } from "lucide-react";
import { useT } from "@/i18n";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-about-3V4Xyc3yvqXFjm4HcKMrFU.webp";

export default function About() {
  const { t } = useT();
  return (
    <>
      <SEOHead
        title={ROUTE_SEO["/about"].title}
        description={ROUTE_SEO["/about"].description}
        canonical={canonical("/about")}
        ogImage={HERO_IMG}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Home", url: canonical("/") },
          { name: "About Us", url: canonical("/about") },
        ])}
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="About My Legacy Cannabis"
            className="w-full h-full object-cover opacity-30"
            loading="eager"
            width="1440"
            height="400"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-6 md:py-10">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "About Us" }]}
            variant="dark"
          />
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-4">
              {t.about.ourLegacy}{" "}
              <span className="text-[#F15929]">{t.about.legacy}</span>
            </h1>
            <p className="text-white/80 text-lg font-body max-w-lg">
              {t.about.tagline}
            </p>
          </div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* Story */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container max-w-4xl">
          <div>
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-6">
              {t.about.ourStory}
            </h2>
            <div className="prose prose-lg max-w-none font-body text-gray-600 space-y-4">
              <p>{t.about.story1}</p>
              <p>{t.about.story2}</p>
              <p>{t.about.story3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#F5F5F5] py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">
              {t.about.ourValues}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Leaf, title: t.about.quality, desc: t.about.qualityDesc },
              {
                icon: Heart,
                title: t.about.community,
                desc: t.about.communityDesc,
              },
              { icon: Shield, title: t.about.safety, desc: t.about.safetyDesc },
              { icon: Award, title: t.about.value, desc: t.about.valueDesc },
            ].map((val, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#4B2D8E] flex items-center justify-center mx-auto mb-4">
                  <val.icon size={24} className="text-white" />
                </div>
                <h3 className="font-display text-lg text-[#4B2D8E] mb-2">
                  {val.title}
                </h3>
                <p className="text-sm text-gray-600 font-body">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#4B2D8E] py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "5", label: t.about.statsLocations },
              { num: "24/7", label: t.about.statsAlwaysOpen },
              { num: "10K+", label: t.about.statsHappyCustomers },
              { num: "100+", label: t.about.statsProducts },
            ].map((stat, i) => (
              <div key={i}>
                <p className="font-display text-4xl md:text-5xl text-[#F15929]">
                  {stat.num}
                </p>
                <p className="text-white/70 font-body text-sm mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-12 md:py-16">
        <div className="container text-center">
          <h2 className="font-display text-3xl text-[#4B2D8E] mb-4">
            {t.about.visitUsToday}
          </h2>
          <p className="text-gray-600 font-body mb-6 max-w-lg mx-auto">
            {t.about.visitUsDesc}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/locations"
              className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3 px-8 rounded-full transition-all inline-flex items-center gap-2"
            >
              <MapPin size={18} /> {t.common.findAStore}
            </Link>
            <Link
              href="/shop"
              className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-8 rounded-full transition-all inline-flex items-center gap-2"
            >
              {t.about.shopOnline} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
