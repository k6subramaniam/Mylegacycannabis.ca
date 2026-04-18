import { useEffect } from "react";
import { SITE_NAME, absoluteOgImage } from "@/lib/seo-config";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  /** JSON-LD structured data object (will be stringified) */
  jsonLd?: Record<string, any> | Record<string, any>[];
}

export default function SEOHead({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage,
  noindex,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes("My Legacy")
      ? title
      : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Core meta
    setMeta("description", description);
    setMeta(
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
    );

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "en_CA", "property");
    if (canonical) setMeta("og:url", canonical, "property");
    // Ensure OG image is an absolute URL
    setMeta("og:image", absoluteOgImage(ogImage), "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", absoluteOgImage(ogImage));

    // Canonical link
    if (canonical) {
      let link = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // Hreflang tags for en-CA (helps Google serve right language version)
    if (canonical) {
      const hreflangs = [
        { lang: "en-CA", href: canonical },
        { lang: "x-default", href: canonical },
      ];
      // Remove stale hreflang links
      document
        .querySelectorAll('link[rel="alternate"][hreflang]')
        .forEach(el => el.remove());
      hreflangs.forEach(({ lang, href }) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", lang);
        link.setAttribute("href", href);
        document.head.appendChild(link);
      });
    }

    // JSON-LD structured data (injected per-page)
    const JSONLD_ID = "seo-head-jsonld";
    const existing = document.getElementById(JSONLD_ID);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = JSONLD_ID;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(
        Array.isArray(jsonLd) ? jsonLd : jsonLd
      );
      document.head.appendChild(script);
    }

    // Cleanup stale JSON-LD on unmount
    return () => {
      const el = document.getElementById(JSONLD_ID);
      if (el) el.remove();
    };
  }, [title, description, canonical, ogType, ogImage, noindex, jsonLd]);

  return null;
}
