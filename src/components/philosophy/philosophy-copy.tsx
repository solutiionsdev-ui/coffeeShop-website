"use client";

// 📖 Design source: Figma "Block 4" 2173:591 (nodes 2188:720, 2190:820, 2190:819, 2188:719)

import { easings } from "@react-spring/web";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";

export interface PhilosophyCopyProps {
  headline: string;
  lede: string;
  /** Three short claims, stacked bottom-right. */
  claims: string[];
  /** Eyebrow is split so the "//" prefix keeps its own negative tracking. */
  eyebrow: { slash: string; label: string };
}

/**
 * The block's four text groups, siblings rather than a column because each sits
 * at its own place on the board.
 *
 * All four are anchored to the **top**, including the eyebrow. Anchoring that
 * one to the bottom instead looks identical at the board's own 800px height and
 * drifts everywhere else: the lede it should sit level with is top-anchored, so
 * on an 834px-tall window the two ended up 35px apart.
 *
 * The headline rises and fades rather than sliding out of a clip box: this block
 * animates as the reader scrolls onto it, and a clipped reveal shows a sliced
 * glyph for as long as the line is travelling — see the menu heading.
 */
export const PhilosophyCopy = ({
  headline,
  lede,
  claims,
  eyebrow,
}: PhilosophyCopyProps) => {
  return (
    <>
      {/* TextEngine sets `position: relative` inline, which beats a positioning
          class on the tag itself — so the box that places it has to be outside. */}
      <div className="order-1 w-full sm:max-lg:col-span-2 sm:max-lg:max-w-[38rem] lg:absolute lg:left-10 lg:top-(--size-philosophy-headline-y) lg:w-(--size-philosophy-headline)">
        <TextEngine
          tag="h2"
          mode="once"
          rootMargin="0px 0px -25% 0px"
          className="justify-start text-left font-display font-semibold text-headline-phone leading-headline tracking-tight uppercase text-foreground sm:text-headline-tablet lg:text-headline"
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

      <div className="order-3 w-full lg:absolute lg:bottom-9.75 lg:max-board:bottom-10.25 lg:left-(--size-philosophy-lede-x) lg:top-auto lg:w-(--size-philosophy-lede) board:bottom-auto board:top-(--size-philosophy-lede-y)">
        <TextEngine
          tag="p"
          mode="once"
          rootMargin="0px 0px -25% 0px"
          className="justify-start text-left font-display font-bold text-base leading-copy tracking-tight uppercase text-foreground sm:max-lg:text-lede-tablet"
          columnGap={0.2}
          wordIn={{ y: 0, opacity: 1 }}
          wordOut={{ y: 14, opacity: 0 }}
          wordStagger={14}
          wordConfig={{ duration: 620, easing: easings.easeOutQuart }}
          delayIn={220}
        >
          {lede}
        </TextEngine>
      </div>

      <ul className="order-4 flex flex-col gap-0.5 max-sm:hidden font-mono text-label leading-copy tracking-tight uppercase text-foreground sm:max-lg:justify-self-end sm:max-lg:text-right lg:absolute lg:bottom-10.25 lg:right-10 lg:top-auto lg:w-(--size-philosophy-claims) lg:text-right board:bottom-auto board:top-(--size-philosophy-claims-y)">
        {claims.map((claim, index) => (
          <Inview
            key={claim}
            tag="li"
            mode="once"
            from={{ clipPath: "inset(0 100% 0 0)" }}
            to={{ clipPath: "inset(0 0 0 0)" }}
            config={{ tension: 80, friction: 26 }}
            delayIn={340 + index * 90}
          >
            {claim}
          </Inview>
        ))}
      </ul>

      <Inview
        tag="p"
        mode="once"
        from={{ opacity: 0, y: 10 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={420}
        className="order-0 font-mono text-label leading-copy tracking-label uppercase text-foreground sm:max-lg:col-span-2 lg:absolute lg:bottom-7.5 lg:left-10 lg:max-board:bottom-10.25 lg:top-auto board:bottom-auto board:top-(--size-philosophy-eyebrow-y)"
      >
        <span className="tracking-slash">{eyebrow.slash}</span>
        <span className="tracking-slash-space"> </span>
        {eyebrow.label}
      </Inview>
    </>
  );
};
