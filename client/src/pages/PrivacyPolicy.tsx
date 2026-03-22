import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="My Legacy Cannabis privacy policy. Learn how we collect, use, and protect your personal information."
        canonical="https://mylegacycannabisca-production.up.railway.app/privacy-policy"
      />

      <section className="bg-[#4B2D8E] py-6">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} variant="dark" />
          <h1 className="font-display text-3xl md:text-4xl text-white">PRIVACY POLICY</h1>
          <p className="text-white/70 font-body mt-2">Last updated: March 2026</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-3xl">
          <div className="prose prose-lg max-w-none font-body text-gray-600 space-y-6">
            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">1. INFORMATION WE COLLECT</h2>
              <p className="text-sm">We collect information you provide directly to us, including:</p>
              <ul className="text-sm space-y-1 mt-2 list-disc pl-5">
                <li>Name, email address, phone number, and shipping address when you create an account or place an order</li>
                <li>Government-issued photo ID for age verification purposes (19+ requirement)</li>
                <li>Payment information (e-Transfer details)</li>
                <li>Communication preferences and correspondence</li>
                <li>Birthday (optional, for rewards program)</li>
              </ul>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">2. HOW WE USE YOUR INFORMATION</h2>
              <ul className="text-sm space-y-1 list-disc pl-5">
                <li>To process and fulfill your orders</li>
                <li>To verify your age and identity as required by Canadian law</li>
                <li>To manage your My Legacy Rewards account and points</li>
                <li>To communicate with you about orders, products, and promotions</li>
                <li>To improve our products and services</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">3. ID VERIFICATION DATA</h2>
              <p className="text-sm">Government-issued ID documents submitted for age verification are:</p>
              <ul className="text-sm space-y-1 mt-2 list-disc pl-5">
                <li>Securely transmitted using encryption</li>
                <li>Used solely for the purpose of age verification</li>
                <li>Deleted after the verification process is complete</li>
                <li>Never shared with third parties</li>
              </ul>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">4. DATA SECURITY</h2>
              <p className="text-sm">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.</p>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">5. COOKIES AND TRACKING</h2>
              <p className="text-sm">We use cookies and similar technologies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser.</p>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">6. YOUR RIGHTS</h2>
              <p className="text-sm">You have the right to:</p>
              <ul className="text-sm space-y-1 mt-2 list-disc pl-5">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </div>

            <div className="bg-[#F5F5F5] rounded-2xl p-6">
              <h2 className="font-display text-xl text-[#4B2D8E] mb-3">7. CONTACT US</h2>
              <p className="text-sm">If you have questions about this Privacy Policy, please contact us at:</p>
              <p className="text-sm mt-2"><strong>Email:</strong> privacy@mylegacycannabis.ca</p>
              <p className="text-sm"><strong>Phone:</strong> (437) 215-4722</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
