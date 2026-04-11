import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const BASE_TITLE = "Mil Laburos";
const BASE_URL = "https://millaburos.com";
const DEFAULT_IMAGE = `${BASE_URL}/opengraph.jpg`;

function setMeta(name: string, content: string, attr = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

function setJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  // Remove previous
  document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.setAttribute("data-seo-jsonld", "true");
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogType = "website",
  ogImage,
  jsonLd,
  noindex,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} - Servicios, Productos, Empleos y Oportunidades en Argentina`;
    document.title = fullTitle;

    if (description) setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow");
    }

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:type", ogType, "property");
    if (description) setMeta("og:description", description, "property");
    setMeta("og:image", ogImage || DEFAULT_IMAGE, "property");
    setMeta("og:url", canonical || `${BASE_URL}${window.location.pathname}`, "property");

    // Twitter
    setMeta("twitter:title", fullTitle);
    if (description) setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage || DEFAULT_IMAGE);

    // Canonical
    setCanonical(canonical || `${BASE_URL}${window.location.pathname}`);

    // JSON-LD
    if (jsonLd) setJsonLd(jsonLd);

    return () => {
      // Cleanup JSON-LD on unmount
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    };
  }, [title, description, keywords, canonical, ogType, ogImage, jsonLd, noindex]);
}
