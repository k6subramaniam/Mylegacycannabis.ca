import { useState } from 'react';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { storeLocations } from '@/lib/data';
import { Link } from 'wouter';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill in all required fields'); return; }
    setSubmitted(true);
    toast.success('Message sent! We\'ll get back to you shortly.');
  };

  return (
    <>
      <SEOHead
        title="Contact Us — My Legacy Cannabis"
        description="Get in touch with My Legacy Cannabis. Contact us by phone, email, or visit any of our 5 locations. Open 24/7."
        canonical="https://mylegacycannabisca-production.up.railway.app/contact"
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact Us' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white">CONTACT US</h1>
          <p className="text-white/70 font-body mt-2">We'd love to hear from you. Reach out anytime.</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              {submitted ? (
                <div className="bg-[#F5F5F5] rounded-2xl p-8 text-center">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h2 className="font-display text-xl text-[#4B2D8E] mb-2">MESSAGE SENT!</h2>
                  <p className="text-gray-600 font-body mb-4">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                    className="text-[#F15929] font-display text-sm hover:underline">SEND ANOTHER MESSAGE</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-[#F5F5F5] rounded-2xl p-6 space-y-4">
                  <h2 className="font-display text-xl text-[#4B2D8E] mb-2">SEND US A MESSAGE</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Name *</label>
                      <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Email *</label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-body block mb-1">Subject</label>
                      <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                        className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E]">
                        <option value="">Select a topic</option>
                        <option value="order">Order Inquiry</option>
                        <option value="shipping">Shipping Question</option>
                        <option value="product">Product Question</option>
                        <option value="verification">ID Verification</option>
                        <option value="rewards">Rewards Program</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-body block mb-1">Message *</label>
                    <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={5}
                      className="w-full bg-white rounded-lg px-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#4B2D8E] resize-none" required />
                  </div>
                  <button type="submit" className="w-full bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3.5 rounded-full transition-all flex items-center justify-center gap-2">
                    <Send size={18} /> SEND MESSAGE
                  </button>
                </form>
              )}
            </motion.div>

            {/* Contact Info */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.2 }} className="space-y-6">
              <div className="bg-[#F5F5F5] rounded-2xl p-6">
                <h2 className="font-display text-xl text-[#4B2D8E] mb-4">GET IN TOUCH</h2>
                <div className="space-y-4">
                  <a href="tel:4372154722" className="flex items-center gap-3 text-[#333] hover:text-[#F15929] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0"><Phone size={18} className="text-white" /></div>
                    <div>
                      <p className="font-display text-sm">CALL US</p>
                      <p className="text-sm font-body text-gray-600">(437) 215-4722</p>
                    </div>
                  </a>
                  <a href="mailto:support@mylegacycannabis.ca" className="flex items-center gap-3 text-[#333] hover:text-[#F15929] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0"><Mail size={18} className="text-white" /></div>
                    <div>
                      <p className="font-display text-sm">EMAIL US</p>
                      <p className="text-sm font-body text-gray-600">support@mylegacycannabis.ca</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F15929] flex items-center justify-center shrink-0"><Clock size={18} className="text-white" /></div>
                    <div>
                      <p className="font-display text-sm text-[#333]">HOURS</p>
                      <p className="text-sm font-body text-gray-600">Open 24/7 — All locations</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F5] rounded-2xl p-6">
                <h3 className="font-display text-lg text-[#4B2D8E] mb-3">OUR LOCATIONS</h3>
                <div className="space-y-3">
                  {storeLocations.map(loc => (
                    <div key={loc.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <MapPin size={16} className="text-[#F15929] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-xs text-[#4B2D8E]">{loc.name.toUpperCase()}</p>
                        <p className="text-xs text-gray-500 font-body truncate">{loc.address}, {loc.city}</p>
                      </div>
                      <a href={`tel:${loc.phone.replace(/\D/g, '')}`} className="text-xs text-[#F15929] font-body hover:underline shrink-0">{loc.phone}</a>
                    </div>
                  ))}
                </div>
                <Link href="/locations" className="text-sm text-[#4B2D8E] hover:text-[#F15929] font-display mt-3 inline-block">VIEW ALL LOCATIONS →</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
