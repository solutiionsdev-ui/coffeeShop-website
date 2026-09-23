"use client";

// 📖 Design source: Figma "Block 2" 2149:5 (node 2161:180)

import { easings } from "@react-spring/web";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";

export interface MenuIntroProps {
  /** Eyebrow is split so the "//" prefix keeps its own negative tracking. */
  eyebrow: { slash: string; label: string };
  heading: string;
  lede: string;
}

/**
 * The heading column. The lede is absolutely placed inside the column exactly
 * as in the design, tucked into the gap the third heading line leaves free.
 *
 * The heading reveals by rising and fading rather than sliding out of a clip
 * box: a clipped reveal necessarily shows a sliced glyph for as long as the
 * line is travelling, and this block animates as it scrolls into view, so that
 * half-cut frame is exactly what a reader arrives on. Without the clip the
 * container can also carry the design's own 0.9 leading directly.
 */
export const MenuIntro = ({ eyebrow, heading, lede }: MenuIntroProps) => {
  return (
    <div className="flex w-full flex-col gap-4 uppercase text-foreground-inverse max-sm:gap-5 sm:max-lg:contents sm:gap-5 lg:absolute lg:left-10 lg:top-(--size-menu-intro-y) lg:w-(--size-menu-intro)">
      <Inview
        tag="p"
        mode="once"
        from={{ clipPath: "inset(0 100% 0 0)" }}
        to={{ clipPath: "inset(0 0 0 0)" }}
        config={{ tension: 46, friction: 26 }}
        className="font-mono text-fine leading-copy tracking-label sm:text-label sm:max-lg:col-span-2"
      >
        <span className="tracking-slash">{eyebrow.slash}</span>
        <span className="tracking-slash-space"> </span>
        {eyebrow.label}
      </Inview>

      <TextEngine
        tag="h2"
        mode="once"
        rootMargin="0px 0px -25% 0px"
        className="justify-start text-left font-display font-bold text-display-phone leading-headline tracking-tight max-sm:max-w-64 sm:text-display-tablet sm:max-lg:col-span-2 sm:max-lg:max-w-104 lg:text-display"
        columnGap={0.2}
        lineIn={{ y: "0%", opacity: 1 }}
        lineOut={{ y: "110%", opacity: 0 }}
        lineStagger={90}
        lineConfig={{ duration: 900, easing: easings.easeOutCubic }}
        overflow
      >
        {heading}
      </TextEngine>

      {/* TextEngine sets `position: relative` inline, which beats a positioning
          class on the tag itself — so the box that places it has to be outside. */}
      <div className="w-full max-sm:max-w-[18.5rem] sm:max-w-80 lg:absolute lg:left-(--size-menu-lede-x) lg:top-(--size-menu-lede-y) lg:w-(--size-menu-lede)">
        <TextEngine
          tag="p"
          mode="once"
          rootMargin="0px 0px -25% 0px"
          className="w-full justify-start text-left font-display font-bold text-base leading-copy tracking-tight sm:max-lg:text-lede-tablet"
          columnGap={0.2}
          wordIn={{ y: 0, opacity: 1 }}
          wordOut={{ y: 14, opacity: 0 }}
          wordStagger={14}
          wordConfig={{ duration: 620, easing: easings.easeOutQuart }}
          delayIn={320}
        >
          {lede}
        </TextEngine>
      </div>
    </div>
  );
};
