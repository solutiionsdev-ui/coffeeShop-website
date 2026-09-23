/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. The business facts below are the same ones
 * the footer and the locations block render, so search engines and the page
 * never disagree.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  /** Brand name — also the OG `siteName`. */
  name: "brewns",
  /** Page title. Longer than the brand so a search result reads on its own. */
  title: "brewns — Specialty Coffee House in San Francisco",
  description:
    "Specialty coffee house in San Francisco. Carefully sourced beans, thoughtfully brewed. Order ahead and skip the line — three locations, open daily 07:00–21:00.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Default Open Graph / Twitter share image (path under `public/`). */
  ogImage: "/open-graph.png",
  twitterHandle: "@brewns",
  author: "brewns coffee house",
  /** Browser theme-color — the same near-black the sections are painted in. */
  themeColor: "#070707",

  /** Business facts, shared with the JSON-LD helper. */
  business: {
    legalName: "brewns coffee house",
    email: "hellbrews@gmail.com",
    telephone: "+1-415-123-4567",
    priceRange: "$$",
    servesCuisine: "Coffee",
    opens: "07:00",
    closes: "21:00",
    sameAs: ["https://instagram.com", "https://tiktok.com"],
    locations: [
      { street: "139 Coffee Street", locality: "San Francisco", region: "CA" },
      { street: "310 Valencia Street", locality: "San Francisco", region: "CA" },
      { street: "56 Columbus Avenue", locality: "San Francisco", region: "CA" },
    ],
  },
} as const;
