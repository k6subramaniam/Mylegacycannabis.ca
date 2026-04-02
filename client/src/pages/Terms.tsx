import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';

export default function Terms() {
  return (
    <>
      <SEOHead
        title="Terms & Conditions"
        description="My Legacy Cannabis terms and conditions of use. Read our policies on ordering, shipping, returns, and more."
        canonical="https://mylegacycannabisca-production.up.railway.app/terms"
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Terms & Conditions' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white">TERMS & CONDITIONS</h1>
          <p className="text-white/70 font-body mt-2">Last updated: March 2026</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-3xl">
          <div className="space-y-6">
            {[
              {
                title: '1. AGE REQUIREMENT',
                content: 'You must be at least 19 years of age to use this website and purchase products from My Legacy Cannabis. By using this site, you confirm that you are 19 years of age or older. All customers must complete a one-time ID verification process before placing their first order.'
              },
              {
                title: '2. PRODUCTS',
                content: 'All products sold by My Legacy Cannabis are intended for legal use in Canada. Product availability, pricing, and descriptions are subject to change without notice. We make every effort to accurately display product images and descriptions, but actual products may vary slightly.'
              },
              {
                title: '3. ORDERING & PAYMENT',
                content: 'The minimum order amount is $40. We currently accept Interac e-Transfer as our only payment method. Orders are processed once payment is received. E-Transfers should be sent to payments@mylegacycannabis.ca with your order number in the message. No taxes are charged on orders.'
              },
              {
                title: '4. SHIPPING & DELIVERY',
                content: 'We ship nationwide across Canada with tracked Xpresspost shipping. Shipping rates vary by region. Free shipping is available on orders over $150. A signature from an adult (19+) is required upon delivery. We are not responsible for shipping delays or other circumstances beyond our control.'
              },
              {
                title: '5. RETURNS & REFUNDS',
                content: 'Due to the nature of our products, we cannot accept returns on opened products. If you receive a damaged or incorrect item, please contact us within 48 hours of delivery with photos of the issue. We will work with you to resolve the problem, which may include a replacement or store credit.'
              },
              {
                title: '6. MY LEGACY REWARDS PROGRAM',
                content: 'The My Legacy Rewards program is subject to its own terms and conditions. Points are earned on completed orders and calculated on the pre-tax, pre-shipping total. Points never expire for active accounts. Rewards cannot exceed 50% of the order subtotal. We reserve the right to modify or terminate the rewards program at any time.'
              },
              {
                title: '7. ACCOUNT RESPONSIBILITY',
                content: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.'
              },
              {
                title: '8. INTELLECTUAL PROPERTY',
                content: 'All content on this website, including text, images, logos, and design, is the property of My Legacy Cannabis and is protected by Canadian copyright law. You may not reproduce, distribute, or use any content without our written permission.'
              },
              {
                title: '9. LIMITATION OF LIABILITY',
                content: 'My Legacy Cannabis shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the amount paid for the specific product or service in question.'
              },
              {
                title: '10. GOVERNING LAW',
                content: 'These terms and conditions are governed by the laws of the Province of Ontario and the federal laws of Canada. Any disputes shall be resolved in the courts of Ontario.'
              },
              {
                title: '11. CHANGES TO TERMS',
                content: 'We reserve the right to update these terms and conditions at any time. Changes will be posted on this page with an updated date. Continued use of the website after changes constitutes acceptance of the new terms.'
              },
              {
                title: '12. CONTACT',
                content: 'For questions about these Terms & Conditions, contact us at support@mylegacycannabis.ca or call (437) 215-4722.'
              }
            ].map((section, i) => (
              <div key={i} className="bg-[#F5F5F5] rounded-2xl p-6">
                <h2 className="font-display text-xl text-[#4B2D8E] mb-3">{section.title}</h2>
                <p className="text-sm text-gray-600 font-body">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
