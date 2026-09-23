// 📖 Design source: Figma "Concept 7" 1276:566 — the full 1440x800 hero frame

import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";

import { OpalesceGradient } from "@/components/ui/opalesce-gradient";

import { HeroCopy, type HeroCopyProps } from "./hero-copy";
import { HeroInfoBar, type HeroInfoBarProps } from "./hero-info-bar";
import { HeroMedia, type HeroMediaProps } from "./hero-media";

export interface HeroProps {
  copy: HeroCopyProps;
  media: HeroMediaProps;
  info: HeroInfoBarProps;
}

/**
 * Hero section — a Server Component that composes the background and three
 * client leaves. The frame fills the viewport height; everything inside is
 * positioned from the edge it is anchored to in the design.
 *
 * Three stacked layers: the Opalesce canvas at z-0, this block's own
 * readability scrim at z-1, and the content above both. The section's own background is the same
 * `#070707` as the shader's `bgColor`, so the canvas edge leaves no seam.
 *
 * The top bar is not here: both boards draw the same one, so it lives in
 * `<SiteHeader>` and this section only declares the surface underneath it.
 */
export const Hero = ({ copy, media, info }: HeroProps) => {
  return (
    <section
      aria-label="Introduction"
      className="relative h-lvh w-full overflow-hidden bg-background"
      {...{ [HEADER_THEME_ATTRIBUTE]: "dark" }}
    >
      <OpalesceGradient />

      {/* Keeps the caramel highlights from drifting under the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-1 bg-[image:var(--hero-scrim)]"
      />

      {/* A column below the desktop board, the board's own absolute frame at
          and above it. The column is what lets the section hold 100% of the
          device's height without the copy being pinned to an 800px measurement. */}
      <div className="absolute inset-0 z-10 flex flex-col px-5 pb-5 pt-18 max-sm:pt-24 sm:px-10 sm:pb-10 sm:pt-32 sm:max-lg:pt-24 lg:block lg:p-0">
        <HeroMedia {...media} />
        <HeroCopy {...copy} />
        <HeroInfoBar {...info} />
      </div>
    </section>
  );
};
