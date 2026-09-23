"use client";

import type { RefObject } from "react";

import { Hover } from "@/components/animation/springs/hover";

/** Rises as the product lifts off it — one gesture, so one spring shape. */
const RISE = { tension: 210, friction: 26 };

export interface HeroProductCardProps {
  eyebrow: { slash: string; label: string };
  /** The bag on the plinth, named. */
  name: string;
  price: string;
  /** Weight, grind, origin — the same three facts the bag is printed with. */
  meta: string[];
  /** The product's own hit area; the card answers that, not the whole frame. */
  trigger: RefObject<HTMLElement | null>;
}

/**
 * The card the product carries: what it is, what it costs, how it is ground.
 *
 * It lands in the one pocket of empty ground the composition has — above the
 * cup, right of the bag's shoulder. Every other spot either covers the print it
 * is describing or falls past the fold. It hangs off the page's own right
 * gutter, on the header's line, because the product's frame overhangs the
 * viewport at every desktop width and anything pinned to the product's right
 * edge is cut off at 1280 and below. It rises as the product lifts, which is why
 * the two share a spring shape: one move, not a tooltip that happened to fire.
 *
 * Desktop only. Below the board the frame is a full-width layer behind the copy,
 * there is no pointer to hover with, and a card pinned over the product would
 * cover the very thing it describes.
 */
export const HeroProductCard = ({
  eyebrow,
  name,
  price,
  meta,
  trigger,
}: HeroProductCardProps) => {
  return (
    <Hover
      trigger={trigger}
      from={{ opacity: 0, y: 18 }}
      to={{ opacity: 1, y: 0 }}
      config={RISE}
      className="pointer-events-none absolute right-10 top-[13%] hidden w-max lg:block"
    >
      {/* Glass rather than a solid panel: it lies over the product shot, and a
          filled card there would read as a hole cut in it. */}
      <div className="border border-foreground/20 bg-background/70 px-5 py-4 text-foreground backdrop-blur-md">
        <p className="font-mono text-fine leading-copy tracking-label uppercase text-foreground/45">
          <span className="tracking-slash">{eyebrow.slash}</span>
          <span className="tracking-slash-space"> </span>
          {eyebrow.label}
        </p>

        {/* Name left, price right — the row the menu cards already use, so the
            hero's product reads as one of them rather than a new pattern. */}
        <div className="mt-3 flex items-baseline justify-between gap-10">
          <p className="font-display font-bold text-headline-phone leading-headline tracking-tight uppercase">
            {name}
          </p>
          <p className="font-mono text-base leading-flush tabular-nums">
            {price}
          </p>
        </div>

        <ul className="mt-3 flex items-center gap-2.5 border-t border-foreground/15 pt-3 font-mono text-fine leading-flush tracking-label uppercase text-foreground/55">
          {meta.map((fact, index) => (
            <li key={fact} className="flex items-center gap-2.5">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="size-[3px] rounded-full bg-foreground/30"
                />
              )}
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </Hover>
  );
};
