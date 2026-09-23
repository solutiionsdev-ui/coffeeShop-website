/**
 * @fileoverview JSON-LD structured data helpers.
 *
 * Structured data lets search engines understand the site as entities
 * (Organization, WebSite, the physical shops) rather than just text — improving
 * rich results. Render the output inside a `<script type="application/ld+json">`.
 */

import { siteConfig } from "@/lib/site";

/**
 * Organization + WebSite + one CafeOrCoffeeShop per location.
 *
 * Emit once, in the root layout. The nodes are linked by `@id` so crawlers
 * treat them as one business rather than four unrelated entities. Every fact
 * here is also rendered on the page — in the footer and the locations block —
 * which is what keeps the markup eligible rather than flagged.
 */
export function getSiteStructuredData() {
  const { business } = siteConfig;

  const shops = business.locations.map((location, i) => ({
    "@type": "CafeOrCoffeeShop",
    "@id": `${siteConfig.url}/#location-${i + 1}`,
    name: siteConfig.name,
    parentOrganization: { "@id": `${siteConfig.url}/#organization` },
    url: siteConfig.url,
    image: `${siteConfig.url}${siteConfig.ogImage}`,
    telephone: business.telephone,
    email: business.email,
    priceRange: business.priceRange,
    servesCuisine: business.servesCuisine,
    address: {
      "@type": "PostalAddress",
      streetAddress: location.street,
      addressLocality: location.locality,
      addressRegion: location.region,
      addressCountry: "US",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: business.opens,
      closes: business.closes,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        legalName: business.legalName,
        description: siteConfig.description,
        url: siteConfig.url,
        logo: `${siteConfig.url}/android-icon-192x192.png`,
        email: business.email,
        telephone: business.telephone,
        sameAs: business.sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
      ...shops,
    ],
  };
}
