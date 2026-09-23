import type { Metadata, Viewport } from "next";
import { Geist, Onest } from "next/font/google";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { LazyCookie } from "@/components/common/Cookie";
import { SiteFooter } from "@/components/common/footer";
import { SiteHeader } from "@/components/common/header";
import { AdaptiveGrid } from "@/components/common/grid";
import { SitePreloader } from "@/components/common/preloader";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";
import { siteFooter } from "@/data/mocks/footer";
import { siteNavigation } from "@/data/mocks/navigation";

import "@/app/globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

/* Type stack for the Figma "Concept 7" board (1276:566) — the faces ship with
   the repo under src/fonts, so they are loaded locally rather than from a CDN. */
/* Geist comes from Google rather than `src/fonts` because the board for Block 4
   sets its headline in SemiBold, and the local file is a static Bold instance
   with no weight axis — 600 cannot be synthesised from it. Same typeface, so
   700 renders identically to the local file it replaces (verified by diffing
   the hero and menu headlines before and after). */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const spaceMono = localFont({
  src: "../fonts/SpaceMono-Regular.ttf",
  variable: "--font-space-mono",
  weight: "400",
  display: "swap",
});

const allura = localFont({
  src: "../fonts/Allura-Regular.ttf",
  variable: "--font-allura",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${onest.variable} ${geist.variable} ${spaceMono.variable} ${allura.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          <SitePreloader
            logoMask={siteNavigation.logoMask}
            brand={siteNavigation.brand}
          />
          <AdaptiveGrid />
          <ReducedMotion />
          <LazyCookie />
          <SiteHeader {...siteNavigation} />
          {children}
          <SiteFooter {...siteFooter} />
        </ScrollLayout>
      </body>
    </html>
  );
}
