"use client";

// 📖 Design source: Figma "Block 3_v2" 2164:283 (nodes 2190:1078, 2246:1446)

import Image from "next/image";
import { useRef, type RefObject } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";

import { LocationsCup } from "./locations-cup";

/** Distance the dial lags behind the page as the block rises into view, in px. */
const DIAL_PARALLAX = 26;

export interface LocationsDialProps {
  dial: { src: string; alt: string; width: number; height: number };
  cup: { src: string; alt: string; width: number; height: number };
}

/**
 * The clock face with the iced latte turning at its centre.
 *
 * Dial and cup drift at different rates as the block rises into view — that
 * difference is the parallax. Both land on zero at the end of the range, so the
 * composition settles onto the board exactly rather than near it.
 *
 * The range is measured against the whole section, not either image, and ends
 * at `center center` rather than `bottom top`. This block is currently the
 * page's last, so the document stops scrolling before `bottom top` could ever
 * be reached and the motion would strand part-way. `center center` is reached
 * while the block is fully on screen, and `useSpringTrigger` clamps progress to
 * 1, so everything then holds however far the page grows.
 */
export const LocationsDial = ({ dial, cup }: LocationsDialProps) => {
  const range = useRef<HTMLDivElement>(null);
  const turnRange = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Measures the scroll range: the whole section rather than either image,
          which stretches the motion over ~190px more of scrolling. */}
      <div
        ref={range}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      />

      {/* The cup's turn range: the same box lifted by a fifth of the block, so
          the turn starts (and ends) a fifth of a screen sooner without changing
          its length — the rate stays exactly what it was. The trigger positions
          are a fixed vocabulary, so the lead is carried by the box instead. */}
      <div
        ref={turnRange}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-1/5 h-full"
      />

      {/* Dial and cup share one box below the desktop board so the cup can be
          measured against the face instead of against the section, and so the
          addresses below them sit in the flow rather than under the cup.
          `lg:contents` dissolves the box again and the board's own absolute
          placement takes over unchanged. */}
      <div className="relative mx-auto aspect-square w-full max-w-80 sm:max-w-[26rem] max-lg:order-3 max-lg:col-span-2 sm:max-lg:max-w-[34rem] lg:contents">
        <Inview
          tag="figure"
          mode="once"
          from={{ opacity: 0 }}
          to={{ opacity: 1 }}
          config={{ tension: 60, friction: 26 }}
          className="pointer-events-none absolute inset-0 lg:inset-auto lg:left-1/2 lg:top-(--size-locations-dial-y) lg:size-(--size-locations-dial) lg:-translate-x-1/2"
        >
          <SpringTrigger
            tag="span"
            mode="scrub"
            /* React 19 types a null-initialised ref as nullable; the vendored
             engine's prop predates that and is not ours to change. */
            trigger={range as RefObject<HTMLElement>}
            start="top bottom"
            end="center center"
            from={{ y: DIAL_PARALLAX }}
            to={{ y: 0 }}
            className="block size-full"
            innerClassName="block size-full"
          >
            <Image
              src={dial.src}
              alt={dial.alt}
              width={dial.width}
              height={dial.height}
              priority
              className="size-full object-cover"
            />
          </SpringTrigger>
        </Inview>

        <LocationsCup {...cup} trigger={range} turnTrigger={turnRange} />
      </div>
    </>
  );
};
