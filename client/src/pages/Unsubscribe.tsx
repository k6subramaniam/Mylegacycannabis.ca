import SEOHead from "@/components/SEOHead";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { Mail, CheckCircle } from "lucide-react";

export default function Unsubscribe() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const unsubMutation = trpc.newsletter.unsubscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await unsubMutation.mutateAsync({ email });
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Unsubscribe — My Legacy Cannabis"
        description="Manage your email preferences"
      />
      <section className="bg-[#F5F5F5] min-h-[60vh] py-16">
        <div className="container max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            {done ? (
              <div className="text-center py-6">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h1 className="font-display text-2xl text-[#4B2D8E] mb-3">
                  You've Been Unsubscribed
                </h1>
                <p className="text-gray-600 font-body mb-6">
                  You will no longer receive newsletter emails from My Legacy
                  Cannabis. You can resubscribe anytime from our homepage.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3 px-8 rounded-full transition-all hover:scale-105"
                >
                  Return to Homepage
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <Mail size={40} className="text-[#4B2D8E] mx-auto mb-3" />
                  <h1 className="font-display text-2xl text-[#4B2D8E] mb-2">
                    Unsubscribe from Newsletter
                  </h1>
                  <p className="text-gray-600 font-body text-sm">
                    Enter the email address you'd like to unsubscribe. You will
                    no longer receive promotional emails from My Legacy Cannabis.
                  </p>
                </div>
                <form onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 font-body text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] transition-all mb-4"
                    required
                    disabled={loading}
                    aria-label="Email address"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-display py-3 px-8 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Unsubscribe"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
