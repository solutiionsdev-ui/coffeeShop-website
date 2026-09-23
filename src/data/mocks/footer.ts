/**
 * Site footer content — Figma "Concept 6" (2173:655).
 *
 * Site-wide chrome like the header, so it sits beside `navigation.ts` rather
 * than with a page's sections.
 */
import type { SiteFooterProps } from "@/components/common/footer";

export const siteFooter: SiteFooterProps = {
  logoMask: "/assets/shared/wordmark-mask.webp",
  swirlMask: "/assets/shared/swirl-mask.webp",
  brand: "brewns",
  tagline: "COFFEE FOR RIGHT NOW.MADE FOR YOUR DAY.",
  columns: [
    {
      heading: "Shop",
      links: [
        { label: "COFFEE", href: "#shop-coffee" },
        { label: "SUBSCRIPTIONS", href: "#subscriptions" },
        { label: "MERCH", href: "#merch" },
        { label: "GIFT CARDS", href: "#gift-cards" },
      ],
    },
    {
      heading: "Menu",
      links: [
        { label: "COFFEE", href: "#menu-coffee" },
        { label: "NON-COFFEE", href: "#non-coffee" },
        { label: "SIGNATURE DRINKS", href: "#signature" },
        { label: "FOOD", href: "#food" },
      ],
    },
    {
      heading: "about us",
      links: [
        { label: "OUR STORY", href: "#story" },
        { label: "COFFEE & SOURCING", href: "#sourcing" },
        { label: "journal", href: "#journal" },
        { label: "CAREERS", href: "#careers" },
      ],
    },
  ],
  contact: {
    heading: "contact",
    items: [
      { label: "hellbrews@gmail.com", href: "mailto:hellbrews@gmail.com" },
      { label: "(415) 123-4567", href: "tel:+14151234567" },
    ],
  },
  locations: {
    label: "OUR LOCATIONS",
    addresses: [
      ["139 Coffee Street", "San Francisco, CA"],
      ["310 Valencia Street", "San Francisco, CA"],
      ["56 Columbus Avenue", "San Francisco, CA"],
    ],
    hours: ["OPEN DAILY", "07:00 - 21:00"],
  },
  legal: {
    copyright: "© 2026 BREWNS COFFEE HOUSE.",
    social: {
      separator: " & ",
      links: [
        { label: "INSTAGRAM", href: "https://instagram.com" },
        { label: "TIKTOK", href: "https://tiktok.com" },
      ],
    },
    terms: {
      separator: " / ",
      links: [
        { label: "PRIVACY POLICY", href: "#privacy" },
        { label: "TERMS OF USE", href: "#terms" },
      ],
    },
  },
};
