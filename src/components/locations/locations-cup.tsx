"use client";

// 📖 Design source: Figma "Block 3_v2" 2164:283 (node 2246:1446)

import { animated, useSpring } from "@react-spring/web";
import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { useWindowWidth } from "@/hooks/use-window-size";
import { isMobileDisabled, springsConfig } from "@/lib/springs/config";

/**
 * Clock position the cup turns to, in degrees clockwise from 12.
 *
 * 30° is 1:00. Keep this **at or below 90°** (3 o'clock): past that the cup
 * carries on over onto its head, which is the one thing the motion must not do.
 * It lives here rather than in `globals.css` because spring `from`/`to` take
 * plain numbers and unit strings — a `var()` would not animate.
 *
 * This is also the speed control: the turn is spread over the scroll range set
 * by its `start`/`end` below, so the rate is this angle divided by that distance.
 *
 * NOTE the turn's range is `center center` → `bottom top` of `turnTrigger` — a
 * copy of the section's box lifted by a fifth of its height, so the turn begins
 * a fifth of a screen before the block fills the viewport rather than exactly
 * as it does. That range needs scroll room *after* the block: with this section
 * last on the page the document stops early and the turn strands part-way.
 */
const CUP_MAX_ROTATION = 38;

/** How far the cup leans toward the cursor, in degrees on each axis. */
const CUP_MAX_TILT = 14;

/** Distance the cup lags behind the page as the block rises into view, in px. */
const CUP_PARALLAX = 80;

export interface LocationsCupProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Section-sized element the scroll range is measured against. */
  trigger: RefObject<HTMLDivElement | null>;
  /** The same box, lifted, that the turn's range is measured against. */
  turnTrigger: RefObject<HTMLDivElement | null>;
}

/**
 * The iced latte at the centre of the dial, carrying three separate motions.
 *
 * They are deliberately on three nested elements rather than one spring, so
 * none of them fights the others for the `transform` property:
 *
 * 1. **Perspective** — a static container, so the lean below reads as depth.
 * 2. **Lean** — follows the pointer across the section. There is no primitive
 *    for this in `components/animation/springs/`: `<Hover>` only knows enter and
 *    leave, not where the cursor is, so this one talks to `@react-spring/web`
 *    directly. It is off wherever hover is (see `springsConfig`).
 * 3. **Parallax** — runs while the block rises *into* view and resolves to zero.
 * 4. **Turn** — runs while the block leaves *upward*, so the cup stands exactly
 *    as the board draws it for the whole time the block is the screen.
 *
 * Parallax and turn are separate springs because they occupy opposite halves of
 * the block's travel: one finishes where the other starts.
 */
export const LocationsCup = ({
  src,
  alt,
  width,
  height,
  trigger,
  turnTrigger,
}: LocationsCupProps) => {
  const frame = useRef<HTMLDivElement>(null);
  const viewportWidth = useWindowWidth();
  const tiltDisabled = isMobileDisabled(
    springsConfig.disableOnMobile.hover,
    viewportWidth,
  );

  const [tilt, tiltApi] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    config: { tension: 90, friction: 22 },
  }));

  useEffect(() => {
    const section = frame.current?.closest("section");
    if (!section || tiltDisabled) return;

    const onMove = (event: PointerEvent) => {
      const box = section.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const dy =
        (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      tiltApi.start({
        rotateY: clamp(dx) * CUP_MAX_TILT,
        rotateX: -clamp(dy) * CUP_MAX_TILT,
      });
    };
    const onLeave = () => tiltApi.start({ rotateX: 0, rotateY: 0 });

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [tiltApi, tiltDisabled]);

  return (
    <div
      ref={frame}
      aria-hidden="true"
      /* Percentages of the dial box below the desktop board — the cup is 280 of
         the face's 654 wide and starts 84 below its top. */
      className="pointer-events-none absolute left-1/2 top-[12.8%] h-[64.2%] w-[42.8%] -translate-x-1/2 [perspective:900px] lg:top-(--size-locations-cup-y) lg:h-(--size-locations-cup-height) lg:w-(--size-locations-cup-width)"
    >
      <animated.div
        className="size-full [transform-style:preserve-3d]"
        style={tilt}
      >
        <SpringTrigger
          tag="span"
          mode="scrub"
          /* React 19 types a null-initialised ref as nullable; the vendored
             engine's prop predates that and is not ours to change. */
          trigger={trigger as RefObject<HTMLElement>}
          start="top bottom"
          end="center center"
          from={{ y: CUP_PARALLAX }}
          to={{ y: 0 }}
          className="block size-full"
          innerClassName="block size-full"
        >
          <SpringTrigger
            tag="span"
            mode="scrub"
            trigger={turnTrigger as RefObject<HTMLElement>}
            start="center center"
            end="bottom top"
            from={{ rotate: "0deg" }}
            to={{ rotate: `${CUP_MAX_ROTATION}deg` }}
            className="block size-full"
            innerClassName="block size-full"
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority
              className="size-full object-cover"
            />
          </SpringTrigger>
        </SpringTrigger>
      </animated.div>
    </div>
  );
};
