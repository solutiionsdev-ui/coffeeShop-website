"use client";

import { animated, easings, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState } from "react";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { usePageReady } from "@/hooks/use-page-ready";

/** Where the fill sweeps from. */
export type SwirlFillDirection = "ltr" | "rtl";

/**
 * The blobs the colour grows out of, left-to-right order. Each is a circle
 * centred at `x`/`y` (percent of the swirl's box) that opens once `--fill`
 * passes `delay`.
 *
 * Every blob's rate is solved so that all of them reach the same radius
 * (`REACH`, past the box's diagonal) at the same moment, `--fill` 100. The
 * last patches of the shape therefore close from several sides at once while
 * the clock is easing out, instead of one late, fast blob slamming the rest of
 * the shape shut — which is what made the old ending look abrupt.
 */
const BLOBS = [
  { x: 0, y: 78, delay: 0 },
  { x: 30, y: 22, delay: 10 },
  { x: 58, y: 88, delay: 22 },
  { x: 92, y: 40, delay: 34 },
] as const;

/** Radius every blob ends at, percent of its gradient ray — well past full. */
const REACH = 115;

/** Width of each blob's soft rim, percent of the ray. Wide, so the edge
    dissolves rather than draws a line. */
const FEATHER = 14;

/**
 * The fill's timing. Not tied to the scroll: it plays once, on its own clock,
 * long and eased gently at both ends so the colour spreads and settles.
 */
const FILL = { duration: 3400, easing: easings.easeInOutSine };
const DELAY = 100;

/**
 * Share of the section that has to be on screen before the fill starts. The
 * section, not the swirl: the swirl is larger than the block and reaches up
 * into the one above, so watching the swirl itself fired while the page was
 * still under the preloader and the fill had finished before anyone saw it.
 */
const THRESHOLD = 0.12;

/**
 * Scroll parallax on the swirl, px: it drifts from `-PARALLAX` to `PARALLAX`
 * while its box crosses the screen, lagging the page like a background.
 */
const PARALLAX = 100;

/** Fades out the top of the section, so a swirl that runs past the section's
    top edge dissolves into it instead of being cut straight across. */
const FADE_TOP =
  "[mask-image:linear-gradient(to_bottom,transparent,black_22%)]";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The fill's own mask: one radial gradient per blob, all driven by `--fill`.
 * Mask layers add, so the blobs union; nested inside the swirl's mask, the
 * two multiply and the colour only ever lands inside the swirl.
 *
 * Exported for the preloader's GPU warm-up, which paints it at two fill values
 * so the GPU programs for both phases of these gradients exist before the
 * swirl first plays (`common/preloader/gpu-warmup.tsx`).
 */
export const blobMask = (direction: SwirlFillDirection) =>
  BLOBS.map(({ x, y, delay }) => {
    const cx = direction === "ltr" ? x : 100 - x;
    const rate = REACH / (100 - delay);
    const radius = `calc((var(--fill) - ${delay}) * ${rate}%)`;
    return `radial-gradient(circle at ${cx}% ${y}%, #000 calc(${radius} - ${FEATHER}%), transparent ${radius})`;
  }).join(", ");

export interface SwirlFillProps {
  /** Alpha mask of the brand swirl. */
  mask: string;
  direction: SwirlFillDirection;
  /** Positions and sizes the swirl in its section. */
  className: string;
  /** Dissolve the swirl into the section's top edge rather than cut it. */
  fadeTop?: boolean;
}

/**
 * The brand swirl behind a light block, filling with colour as the block
 * arrives and drifting on a parallax as it scrolls.
 *
 * Nothing is painted before the fill: the shape exists only as far as the
 * colour has reached. The colour grows out of a few round, soft-rimmed blobs
 * that open one after another across the swirl (`BLOBS`) and finish together.
 *
 * The fill starts once, when a little of its section is on screen and the
 * preloader has gone, and then runs on time (`FILL`), not on the scroll. It
 * talks to `@react-spring/web` directly because its trigger is the section
 * and its value is a custom property; the vendored `<Inview>` watches its own
 * box. The parallax is a `<SpringTrigger>` scrub over the swirl's box. Under
 * reduced motion the swirl is simply there.
 *
 * Layers, outside in: a section-sized frame that carries the optional top
 * fade and does not move; the parallax box, placed by `className`; the swirl
 * mask; the fill. Both masks are data (the swirl's URL, the blobs'
 * gradients), hence the inline styles.
 */
export const SwirlFill = ({
  mask,
  direction,
  className,
  fadeTop = false,
}: SwirlFillProps) => {
  const shape = useRef<HTMLSpanElement>(null);
  const ready = usePageReady((state) => state.ready);
  const [seen, setSeen] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const section = shape.current?.closest("section");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInstant(window.matchMedia(REDUCED_MOTION_QUERY).matches);
        setSeen(true);
        observer.disconnect();
      },
      { threshold: THRESHOLD },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const fill = useSpring({
    "--fill": seen && ready ? 100 : 0,
    config: FILL,
    delay: DELAY,
    immediate: instant,
  });

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 block ${fadeTop ? FADE_TOP : ""}`}
    >
      <SpringTrigger
        tag="span"
        innerTag="span"
        mode="scrub"
        start="top bottom"
        end="bottom top"
        from={{ y: -PARALLAX }}
        to={{ y: PARALLAX }}
        className={`absolute block ${className}`}
        innerClassName="block size-full"
      >
        <span
          ref={shape}
          className="relative block size-full [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]"
          style={{ maskImage: `url(${mask})` }}
        >
          <animated.span
            className="absolute inset-0 block bg-surface-inverse-backdrop [mask-repeat:no-repeat] [mask-size:100%_100%]"
            style={{ ...fill, maskImage: blobMask(direction) }}
          />
        </span>
      </SpringTrigger>
    </span>
  );
};
