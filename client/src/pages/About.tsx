import SEOHead from '@/components/SEOHead';
import { Breadcrumbs, WaveDivider } from '@/components/Layout';
import { Link } from 'wouter';
import { MapPin, Clock, Shield, Truck, Heart, Leaf, Users, Award, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/86973655/5wgxseZemq4jvbSSj7t6zG/hero-about-3V4Xyc3yvqXFjm4HcKMrFU.webp';
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

export default function About() {
  return (
    <>
      <SEOHead
        title="About Us — My Legacy Cannabis"
        description="Learn about My Legacy Cannabis — a 24/7 cannabis dispensary serving the GTA and Ottawa since 2020. Our mission, values, and commitment to premium cannabis products."
        canonical="https://mylegacycannabis.ca/about"
      />

      {/* Hero */}
      <section className="relative bg-[#4B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="About My Legacy Cannabis" className="w-full h-full object-cover opacity-30" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B2D8E] via-[#4B2D8E]/80 to-transparent" />
        </div>
        <div className="container relative z-10 py-6 md:py-10">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About Us' }]} variant="dark" />
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-4">
              OUR <span className="text-[#F15929]">LEGACY</span>
            </h1>
            <p className="text-white/80 text-lg font-body max-w-lg">
              Building a trusted cannabis community across Ontario — one customer at a time.
            </p>
          </motion.div>
        </div>
        <WaveDivider color="#ffffff" />
      </section>

      {/* Story */}
      <section className="bg-white py-12 md:py-16 -mt-1">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-6">OUR STORY</h2>
            <div className="prose prose-lg max-w-none font-body text-gray-600 space-y-4">
              <p>My Legacy Cannabis was founded with a simple mission: to provide premium cannabis products in a safe, welcoming, and accessible environment. What started as a single location in Mississauga has grown into a network of five dispensaries across the Greater Toronto Area and Ottawa.</p>
              <p>We believe that everyone deserves access to high-quality cannabis products, knowledgeable staff, and a shopping experience that respects both your time and your privacy. That's why all of our locations are open 24/7 — because your needs don't follow a 9-to-5 schedule.</p>
              <p>Our team is passionate about cannabis education and community building. We carefully curate our product selection to ensure every item on our shelves meets our standards for quality, safety, and value. From premium flower and pre-rolls to edibles, vapes, and concentrates, we offer a diverse range of products to suit every preference and experience level.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#F5F5F5] py-12 md:py-16">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#4B2D8E] mb-3">OUR VALUES</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Leaf, title: 'QUALITY', desc: 'We source only the finest cannabis products, rigorously tested for potency and purity.' },
              { icon: Heart, title: 'COMMUNITY', desc: 'We are committed to building a welcoming, inclusive space for all cannabis enthusiasts.' },
              { icon: Shield, title: 'SAFETY', desc: 'Age verification, secure transactions, and discreet packaging — your safety is our priority.' },
              { icon: Award, title: 'VALUE', desc: 'Competitive pricing, no taxes, and a rewards program that gives back to our loyal customers.' },
            ].map((val, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-full bg-[#4B2D8E] flex items-center justify-center mx-auto mb-4">
                  <val.icon size={24} className="text-white" />
                </div>
                <h3 className="font-display text-lg text-[#4B2D8E] mb-2">{val.title}</h3>
                <p className="text-sm text-gray-600 font-body">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#4B2D8E] py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: '5', label: 'Locations' },
              { num: '24/7', label: 'Always Open' },
              { num: '10K+', label: 'Happy Customers' },
              { num: '100+', label: 'Products' },
            ].map((stat, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.1 }}>
                <p className="font-display text-4xl md:text-5xl text-[#F15929]">{stat.num}</p>
                <p className="text-white/70 font-body text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-12 md:py-16">
        <div className="container text-center">
          <h2 className="font-display text-3xl text-[#4B2D8E] mb-4">VISIT US TODAY</h2>
          <p className="text-gray-600 font-body mb-6 max-w-lg mx-auto">Find your nearest My Legacy Cannabis location or shop online with nationwide delivery.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/locations" className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3 px-8 rounded-full transition-all inline-flex items-center gap-2">
              <MapPin size={18} /> FIND A STORE
            </Link>
            <Link href="/shop" className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-8 rounded-full transition-all inline-flex items-center gap-2">
              SHOP ONLINE <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
