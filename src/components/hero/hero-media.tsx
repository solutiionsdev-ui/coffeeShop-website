"use client";

// 📖 Design source: Figma "Concept 7" 1276:566 (node 1312:322)

import { useRef, useState } from "react";

import { Inview } from "@/components/animation/springs/in-view";

import { HeroModel, type HeroPiece } from "./hero-model";
import {
  HeroProductCard,
  type HeroProductCardProps,
} from "./hero-product-card";

/**
 * Where the product stands inside the frame, as fractions of it. The model
 * solves this exactly for the pixels it is given; these are the same rectangle
 * rounded off, and they only have to be close — all they carry is where the
 * pointer has to be for the product to answer it.
 */
const HIT = "left-[27%] right-[15%] top-[5%] bottom-[23%]";

/** The product is a thing you can pick up, so the cursor says so. */
const GRAB = "cursor-grab touch-none active:cursor-grabbing";

export interface HeroMediaProps {
  /** Product still — the packaging + cup composition. */
  src: string;
  alt: string;
  /** What each piece is, shown when that piece is hovered. */
  cards: Record<HeroPiece, Omit<HeroProductCardProps, "trigger">>;
}

/**
 * The hero's product still. It bleeds past the frame exactly as it does in the
 * design, so the section clips it rather than resizing it.
 *
 * The board's masked swirl used to sit behind this; the Opalesce canvas
 * (`ui/opalesce-gradient.tsx`) replaces it.
 *
 * Below the desktop board it is a flow item that takes whatever height the copy
 * and the info bar leave, and is contained inside it rather than cropped. That
 * is what stops the block having a dead band in the middle: the still is sized
 * by the device instead of being a fixed box floating in the leftover space.
 *
 * The lean toward the pointer that used to sit here as a CSS tilt is now the
 * model's own rotation, in `hero-model.tsx` — a card tipped in the plane of the
 * screen reads as a card however well it is lit. The same rectangle is the
 * handle: grab the product and it turns under the hand.
 *
 * Between 1024 and 1439 the still keeps the board's size and is moved, not
 * scaled: the frame is squarer than the board's 1.8, so the overhang anchor
 * pushed the product off the right edge. What is anchored to the page's gutter
 * is the PRODUCT, not the picture — the bag and cup occupy 26.9%-84.7% of the
 * file's width and the rest is empty ground, so hanging the box on its own
 * right edge would have left a sixth of the frame paying for nothing.
 */
export const HeroMedia = ({ src, alt, cards }: HeroMediaProps) => {
  const product = useRef<HTMLSpanElement>(null);
  /* The last piece the pointer was on. Kept through the gap between the two,
     so the card does not flick back to a default mid-crossing. */
  const [piece, setPiece] = useState<HeroPiece>("bag");

  return (
    <>
      <Inview
        tag="figure"
        mode="once"
        from={{ opacity: 0, scale: 1.06 }}
        to={{ opacity: 1, scale: 1 }}
        config={{ tension: 45, friction: 24 }}
        /* min-h-full is inert at the design's 1440x800 ratio and only kicks in
         on taller viewports, where the still would otherwise stop short of
         the bottom edge. */
        className="pointer-events-none relative order-2 -mx-5 min-h-0 w-auto flex-1 max-sm:absolute max-sm:inset-x-0 max-sm:-mx-20 max-sm:bottom-0 max-sm:top-[40%] max-sm:-mb-5 max-sm:flex-none sm:-mx-10 sm:max-lg:absolute sm:max-md:inset-x-0 sm:max-md:-mx-32 sm:max-md:top-[42%] sm:max-md:-mb-28 sm:max-md:w-auto md:max-lg:mx-0 md:max-lg:left-[-5rem] md:max-lg:right-auto md:max-lg:w-[max(64rem,calc(100%+16rem))] md:max-lg:top-[35.5%] md:max-lg:-mb-21 sm:max-lg:bottom-0 sm:max-lg:flex-none lg:absolute lg:left-[calc(100%+var(--size-hero-media-overhang)+var(--size-hero-media-nudge)-var(--size-hero-media-width))] lg:max-board:left-[calc(100%-2.5rem-0.847*var(--size-hero-media-width))] board:left-(--size-hero-media-x) lg:top-(--size-hero-media-drop) lg:mx-0 lg:h-(--size-hero-media-height) lg:min-h-full lg:w-(--size-hero-media-width) lg:flex-none"
      >
        <HeroModel
          src={src}
          alt={alt}
          surface={product}
          onPiece={(next) => {
            if (next) setPiece(next);
          }}
        />

        {/* The frame itself stays transparent to the pointer — it overhangs the
          copy column, and making the whole box hot would arm the product from
          behind the headline. Only the product's own rectangle answers. */}
        <span
          ref={product}
          aria-hidden="true"
          className={`absolute hidden lg:block lg:pointer-events-auto ${HIT} ${GRAB}`}
        />
      </Inview>

      {/* Hung off the page's right gutter rather than the product's box: the
          frame overhangs the viewport on every desktop width, so anything
          anchored to the product's right edge is cut off at 1280 and below. */}
      <HeroProductCard {...cards[piece]} trigger={product} />
    </>
  );
};
