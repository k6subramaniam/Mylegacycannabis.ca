import SEOHead from "@/components/SEOHead";
import { Link } from "wouter";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <SEOHead
        title="404 Page Not Found"
        description="The page you are looking for does not exist. Browse our cannabis products or return to the My Legacy Cannabis homepage."
        noindex
      />

      <section className="bg-[#4B2D8E] py-16 md:py-24">
        <div className="container text-center">
          <h1 className="font-display text-7xl md:text-9xl text-[#F15929] mb-4">
            404
          </h1>
          <h2 className="font-display text-2xl md:text-3xl text-white mb-4">
            PAGE NOT FOUND
          </h2>
          <p className="text-white/70 font-body text-lg max-w-md mx-auto mb-8">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-[#F15929] hover:bg-[#d94d22] text-white font-display text-sm py-3 px-8 rounded-full transition-colors"
            >
              <Home size={18} /> GO HOME
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-display text-sm py-3 px-8 rounded-full transition-colors border border-white/20"
            >
              <Search size={18} /> BROWSE SHOP
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
