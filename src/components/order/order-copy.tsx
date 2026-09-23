"use client";

// 📖 Block 5 text — Figma 2190:1130 (nodes 2190:1135, 2190:1150, 2190:1165).
// Static on scroll by design: the receipt is the only thing the feed moves. The
// CTA carries the site-wide hover, which is pointer-driven, not scroll-driven.

import { easings } from "@react-spring/web";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CtaLink } from "@/components/ui/cta-link";

export interface OrderCopyProps {
  headline: string;
  note: string;
  aside: string;
  cta: { label: string; href: string };
}

/**
 * The block's three text groups.
 *
 * They live **outside** the scaled printer scene, on the page's own rem grid,
 * and that is the whole point of this file: the scene scales to COVER the
 * viewport while the grid scales with the root font size, so copy measured in
 * scene px sat on a different left edge from every other block's — visibly so on
 * any window that was not 1440×800. Here `left-10` is the same forty pixels the
 * header, the hero and the footer stand on.
 *
 * The note and the aside group are anchored to the bottom rather than the top:
 * the board puts both a gutter above the baseline, and a top anchor would walk
 * them up the frame as the window grows taller.
 */
export const OrderCopy = ({ headline, note, aside, cta }: OrderCopyProps) => (
  <div className="absolute inset-0 flex flex-col justify-between px-5 pb-5 pt-18 text-foreground sm:px-10 sm:pb-10 sm:pt-24 max-lg:items-center max-lg:text-center lg:block lg:p-0">
    {/* Two readable bands with the machine between them. The scrims are what let
        white type sit over whatever the photograph happens to put behind it. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-background/90 via-background/55 to-transparent lg:hidden"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-background/92 via-background/60 to-transparent lg:hidden"
    />

    <div className="relative flex flex-col gap-4 sm:max-lg:gap-6 lg:contents">
      {/* TextEngine sets `position: relative` inline, which beats a positioning
          class on the tag itself — so the box that places it has to be outside. */}
      <div className="max-sm:max-w-[17rem] sm:max-lg:mx-auto sm:max-lg:max-w-104 lg:absolute lg:left-10 lg:top-(--size-order-headline-y) lg:w-(--size-order-headline)">
        <TextEngine
          tag="h2"
          mode="once"
          rootMargin="0px 0px -25% 0px"
          className="justify-start text-left font-display font-semibold text-headline-phone leading-headline tracking-tight uppercase max-lg:justify-center max-lg:text-center sm:text-headline-tablet lg:text-headline"
          columnGap={0.2}
          lineIn={{ y: "0%", opacity: 1 }}
          lineOut={{ y: "110%", opacity: 0 }}
          lineStagger={90}
          lineConfig={{ duration: 900, easing: easings.easeOutCubic }}
          overflow
        >
          {headline}
        </TextEngine>
      </div>

      <Inview
        tag="p"
        mode="once"
        from={{ clipPath: "inset(0 100% 0 0)" }}
        to={{ clipPath: "inset(0 0 0 0)" }}
        config={{ tension: 46, friction: 26 }}
        delayIn={180}
        className="w-(--size-order-note) max-lg:hidden font-mono text-base leading-copy tracking-tight uppercase lg:absolute lg:bottom-10 lg:left-10 lg:mt-0"
      >
        {note}
      </Inview>
    </div>

    <Inview
      tag="span"
      mode="once"
      from={{ opacity: 0, y: 16 }}
      to={{ opacity: 1, y: 0 }}
      config={{ tension: 80, friction: 26 }}
      delayIn={280}
      className="relative flex w-full flex-col items-start gap-4 max-sm:gap-9 sm:w-(--size-order-aside) sm:gap-6 sm:max-lg:w-120 sm:max-lg:gap-10 max-lg:items-center lg:absolute lg:bottom-10 lg:right-10 lg:gap-(--size-order-aside-gap)"
    >
      {/* No trigger offset here: this block is sticky, so the copy never rises
          past a raised line — it would sit pinned below it and never reveal. */}
      <TextEngine
        tag="span"
        mode="once"
        className="w-full justify-start text-left font-display font-bold text-base leading-copy tracking-tight uppercase sm:max-lg:text-lede-tablet max-lg:justify-center max-lg:text-center"
        columnGap={0.2}
        wordIn={{ y: 0, opacity: 1 }}
        wordOut={{ y: 14, opacity: 0 }}
        wordStagger={14}
        wordConfig={{ duration: 620, easing: easings.easeOutQuart }}
        delayIn={320}
      >
        {aside}
      </TextEngine>

      <CtaLink
        label={cta.label}
        href={cta.href}
        className="w-(--size-order-cta)"
      />
    </Inview>
  </div>
);
