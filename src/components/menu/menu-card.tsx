"use client";

// 📖 Design source: Figma "Block 2" 2149:5 (nodes 2190:828, 2229:18/23/28)

import Image from "next/image";
import { useRef, type RefObject } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { DigitRoll } from "@/components/ui/digit-roll";
import { PointerLean } from "@/components/ui/pointer-lean";
import { rem } from "@/utils/rem";

export interface MenuItemMedia {
  src: string;
  alt: string;
  /** Natural pixel size of the asset — drives next/image's srcset. */
  width: number;
  height: number;
  /** Box the still occupies inside the card's media area, in design px. */
  frame: { width: number; height: number; bottom: number; offsetX: number };
  /** How the still is cropped within that box, as CSS percentages. */
  crop: { top: string; left: string; width: string; height: string };
  /** `cover` only where the design asks for it; the rest stretch to the box. */
  fit: "fill" | "cover";
  /** Card 03's still deliberately spills out of the media area. */
  clip: boolean;
}

export interface MenuItem {
  index: string;
  name: string;
  price: string;
  media: MenuItemMedia;
}

/** Distance the still lags behind its card as the row rises into view, in px. */
const STILL_PARALLAX = 11;

export interface MenuCardProps {
  item: MenuItem;
  /** Position in the row — staggers the reveal. */
  order: number;
}

/**
 * One product card: index, still, name and price.
 *
 * The still's box and crop come in as data because they are properties of the
 * photograph, not design decisions — a different shot needs different numbers.
 *
 * The card carries the dial cup's treatment. The whole card — border, index,
 * photograph, name and price together — leans into the pointer on a perspective,
 * and the still inside lags behind it on the way in. That lag is what makes it
 * parallax rather than just movement: the card arrives on one spring and the
 * photograph on another, so they separate and then close up. The cup's third
 * motion, the turn, stays on the clock — there the cup is the hand on a dial,
 * and on a product card the same rotation only reads as a slipped photo.
 */
export const MenuCard = ({ item, order }: MenuCardProps) => {
  const { media } = item;
  const range = useRef<HTMLDivElement>(null);

  return (
    <PointerLean
      scope="self"
      className="flex flex-1"
      innerClassName="flex flex-1"
    >
      <Inview
        tag="article"
        mode="once"
        from={{ opacity: 0, y: 28 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 80, friction: 26 }}
        delayIn={order * 90}
        className="group relative flex h-64 max-sm:h-[22.5rem] sm:max-lg:h-96 flex-1 flex-col items-center gap-3 border border-foreground-inverse p-3 text-foreground-inverse sm:h-72 sm:gap-4 sm:p-4 lg:h-(--size-menu-card-height)"
      >
        {/* Measures the scroll range for the parallax below: the card, so every
            still in the row runs off the same travel. */}
        <div
          ref={range}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        />

        <p className="h-(--size-cap-12) w-full font-mono text-xs leading-flush uppercase text-foreground-inverse/35 transition-colors duration-[var(--duration-normal)] ease-entrance group-hover:text-foreground-inverse">
          <DigitRoll value={item.index} delayIn={order * 90 + 160} />
        </p>

        <div
          className={`relative min-h-px w-full flex-1 ${media.clip ? "overflow-clip" : ""}`}
        >
          <SpringTrigger
            tag="span"
            mode="scrub"
            /* React 19 types a null-initialised ref as nullable; the vendored
                 engine's prop predates that and is not ours to change. */
            trigger={range as RefObject<HTMLElement>}
            start="top bottom"
            end="center center"
            from={{ y: STILL_PARALLAX }}
            to={{ y: 0 }}
            className="block size-full"
            innerClassName="block size-full"
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{
                width: `calc(${rem(media.frame.width)} * var(--size-menu-still-scale))`,
                maxWidth: "var(--size-menu-still-max)",
                aspectRatio: `${media.frame.width} / ${media.frame.height}`,
                bottom: `calc(${rem(media.frame.bottom)} + var(--size-menu-still-lift))`,
                marginLeft: rem(media.frame.offsetX),
              }}
            >
              <Image
                src={media.src}
                alt={media.alt}
                width={media.width}
                height={media.height}
                className={`absolute max-w-none ${media.fit === "cover" ? "object-cover" : ""}`}
                style={{
                  top: media.crop.top,
                  left: media.crop.left,
                  width: media.crop.width,
                  height: media.crop.height,
                }}
              />
            </div>
          </SpringTrigger>
        </div>

        <div className="flex min-h-(--size-cap-16) w-full items-start justify-between gap-2 max-sm:items-baseline font-mono text-label leading-flush uppercase lg:text-base">
          {/* The name prints across rather than fading: it is the one line on
              the card that is neither a number nor a photograph, and the wipe
              is the same gesture the hero's script accent uses. */}
          <Inview
            tag="p"
            mode="once"
            from={{ clipPath: "inset(0 100% -30% 0)" }}
            to={{ clipPath: "inset(0 0 -30% 0)" }}
            config={{ tension: 58, friction: 26 }}
            delayIn={order * 90 + 300}
          >
            {item.name}
          </Inview>
          <p>
            <DigitRoll value={item.price} delayIn={order * 90 + 240} />
          </p>
        </div>
      </Inview>
    </PointerLean>
  );
};
