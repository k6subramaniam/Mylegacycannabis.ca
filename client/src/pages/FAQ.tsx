import { useState, useMemo } from "react";
import SEOHead from "@/components/SEOHead";
import { Breadcrumbs } from "@/components/Layout";
import { ROUTE_SEO, canonical, buildBreadcrumbJsonLd } from "@/lib/seo-config";
import { Link } from "wouter";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const faqCategories = [
  {
    name: "Ordering",
    items: [
      {
        q: "What is the minimum order amount?",
        a: "The minimum order amount is $40. Orders below this amount cannot be processed.",
      },
      {
        q: "How do I place an order?",
        a: "Browse our shop, add items to your cart, and proceed to checkout. You'll need a verified account to complete your order.",
      },
      {
        q: "Can I modify or cancel my order?",
        a: "Please contact us as soon as possible if you need to modify or cancel your order. Once an order has been shipped, it cannot be cancelled.",
      },
      {
        q: "Are there taxes on my order?",
        a: "No! My Legacy Cannabis does not charge any taxes on orders. The price you see is the price you pay (plus shipping if applicable).",
      },
    ],
  },
  {
    name: "Payment",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "__PAYMENT_METHOD_ANSWER__",
      },
      {
        q: "Do you accept credit cards?",
        a: "Not at this time. We are working on adding credit card payment options in the future.",
      },
      {
        q: "When should I send my e-Transfer?",
        a: "Please send your e-Transfer immediately after placing your order. Orders are processed once payment is received.",
      },
      {
        q: "Is my payment secure?",
        a: "Yes. Interac e-Transfer is a secure, bank-to-bank payment method used by millions of Canadians.",
      },
    ],
  },
  {
    name: "Shipping & Delivery",
    items: [
      {
        q: "Where do you ship?",
        a: "We ship nationwide across Canada with tracked Xpresspost shipping.",
      },
      {
        q: "How much does shipping cost?",
        a: "Shipping rates vary by region: Ontario $10, Quebec $12, Western Canada $15, Atlantic Canada $18, Territories $25. FREE shipping on orders over $150!",
      },
      {
        q: "How long does delivery take?",
        a: "Ontario: 1-2 business days, Quebec: 2-3 days, Western Canada: 3-5 days, Atlantic Canada: 3-5 days, Territories: 5-10 days.",
      },
      {
        q: "Do I get a tracking number?",
        a: "Yes! A tracking number is emailed to you once your order ships.",
      },
      {
        q: "Is the packaging discreet?",
        a: "Absolutely. All orders are shipped in plain, unmarked packaging with no indication of the contents.",
      },
    ],
  },
  {
    name: "ID Verification",
    items: [
      {
        q: "Why do I need to verify my ID?",
        a: "Canadian law requires all cannabis purchasers to be 19 years of age or older. ID verification is a one-time process to confirm your age.",
      },
      {
        q: "What ID do you accept?",
        a: "We accept Canadian Driver's License, Canadian Passport, Provincial Health Card (with photo), and Canadian Citizenship Card.",
      },
      {
        q: "How long does verification take?",
        a: "ID verification is typically completed within 1-2 hours during business hours. You'll receive an email once verified.",
      },
      {
        q: "Is my ID information secure?",
        a: "Yes. Your ID documents are securely transmitted and stored. We only use them for age verification and delete them after the process is complete.",
      },
      {
        q: "Do I need to verify every time I order?",
        a: "No! ID verification is a one-time process. Once verified, you can place orders freely.",
      },
    ],
  },
  {
    name: "Rewards Program",
    items: [
      {
        q: "How do I earn points?",
        a: "Earn 1 point for every $1 spent (pre-tax, pre-shipping). Plus bonus points for signing up (25 pts), birthdays (100 pts), reviews (10 pts), and referrals (50 pts).",
      },
      {
        q: "How do I redeem points?",
        a: "Redeem points at checkout. Minimum 100 points for $5 OFF, up to 2,000 points for $150 OFF.",
      },
      {
        q: "Do points expire?",
        a: "No! Points never expire as long as your account remains active.",
      },
      {
        q: "Can I combine rewards with other offers?",
        a: "Yes, rewards can be combined with other promotions and discounts.",
      },
      {
        q: "What is the maximum discount from rewards?",
        a: "Rewards cannot exceed 50% of your order subtotal.",
      },
    ],
  },
  {
    name: "Account",
    items: [
      {
        q: "How do I create an account?",
        a: 'Click "Sign Up" and fill in your details. You\'ll receive 25 bonus reward points just for creating an account!',
      },
      {
        q: "I forgot my password. What do I do?",
        a: "Contact our support team at support@mylegacycannabis.ca and we'll help you reset your password.",
      },
      {
        q: "Can I track my orders?",
        a: 'Yes! Log in to your account and visit the "Orders" tab to see all your order history and tracking information.',
      },
    ],
  },
];

export default function FAQ() {
  const { t } = useT();
  const { paymentEmail } = useSiteConfig();
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("Ordering");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const next = new Set(openItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenItems(next);
  };

  // Inject dynamic payment email into the static FAQ data
  const dynamicCategories = useMemo(
    () =>
      faqCategories.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({
          ...item,
          a: item.a.replace(
            "__PAYMENT_METHOD_ANSWER__",
            `We currently accept Interac e-Transfer only. After placing your order, send your e-Transfer to ${paymentEmail} with your order number in the message.`
          ),
        })),
      })),
    [paymentEmail]
  );

  const filtered = search.trim()
    ? dynamicCategories
        .map(cat => ({
          ...cat,
          items: cat.items.filter(
            item =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter(cat => cat.items.length > 0)
    : dynamicCategories;

  return (
    <>
      <SEOHead
        title={ROUTE_SEO["/faq"].title}
        description={ROUTE_SEO["/faq"].description}
        canonical={canonical("/faq")}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Home", url: canonical("/") },
          { name: "FAQ", url: canonical("/faq") },
        ])}
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: t.common.home, href: "/" },
              { label: t.common.faq },
            ]}
            variant="dark"
          />
          <h1 className="font-display text-3xl md:text-4xl text-white mb-4">
            {t.faqPage.title}
          </h1>
          <div className="relative max-w-lg">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.faqPage.searchPlaceholder}
              className="w-full bg-white rounded-full pl-11 pr-4 py-3 text-sm font-body border-none focus:ring-2 focus:ring-[#F15929]"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-3xl">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="font-display text-lg text-gray-400 mb-2">
                {t.faqPage.noResults}
              </p>
              <p className="text-gray-500 font-body text-sm">
                {t.faqPage.noResultsDesc}{" "}
                <Link
                  href="/contact"
                  className="text-[#F15929] hover:underline"
                >
                  {t.faqPage.contactUsLink}
                </Link>
                .
              </p>
            </div>
          )}

          <div className="space-y-6">
            {filtered.map(cat => (
              <div key={cat.name}>
                <button
                  onClick={() =>
                    setOpenCategory(openCategory === cat.name ? null : cat.name)
                  }
                  className="w-full flex items-center justify-between bg-[#4B2D8E] text-white font-display text-lg px-5 py-3 rounded-xl mb-2"
                >
                  {cat.name.toUpperCase()}
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${openCategory === cat.name ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {(openCategory === cat.name || search.trim()) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pb-2">
                        {cat.items.map((item, i) => {
                          const key = `${cat.name}-${i}`;
                          const isOpen = openItems.has(key);
                          return (
                            <div
                              key={key}
                              className="bg-[#F5F5F5] rounded-xl overflow-hidden"
                            >
                              <button
                                onClick={() => toggleItem(key)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left"
                              >
                                <span className="font-body text-sm text-[#333] font-medium pr-4">
                                  {item.q}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`text-[#4B2D8E] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              <AnimatePresence>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="px-5 pb-4 text-sm text-gray-600 font-body">
                                      {item.a}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Still have questions */}
          <div className="bg-[#F5F5F5] rounded-2xl p-6 text-center mt-8">
            <h2 className="font-display text-xl text-[#4B2D8E] mb-2">
              {t.faqPage.stillHaveQuestions}
            </h2>
            <p className="text-gray-600 font-body text-sm mb-4">
              {t.faqPage.stillHaveQuestionsDesc}
            </p>
            <Link
              href="/contact"
              className="bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-3 px-8 rounded-full transition-all inline-block"
            >
              {t.contactPage.contactUsTitle}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: dynamicCategories.flatMap(cat =>
              cat.items.map(item => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              }))
            ),
          }),
        }}
      />
    </>
  );
}
