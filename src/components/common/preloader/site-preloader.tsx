"use client";

import { animated, to, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState } from "react";

import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import { usePageReady } from "@/hooks/use-page-ready";

import { GpuWarmup } from "./gpu-warmup";

/** Kept out of JSX children — a bare `//` there reads as a comment. */
const SLASH = "//";

/**
 * How far the level is allowed to rise on each signal. Nothing here is a fake
 * timeline: the first step is mount, the second is the type being ready to
 * paint, the last is the document itself. The gaps between them are what the
 * spring smooths over.
 */
const STEP = { mount: 0.1, fonts: 0.6, loaded: 1 };
/** Shortest time the panel stays up, so a warm cache does not flash it. */
const MIN_VISIBLE = 620;
/** Longest it waits on `load` before going anyway. */
const MAX_WAIT = 4000;
/** The level's own travel — brisk enough that the cup fills before it pours. */
const FILL = { tension: 120, friction: 26 };
/** The pour. Low friction so it leaves like liquid rather than a panel sliding. */
const POUR = { tension: 90, friction: 18 };
/** Beat between the cup being full and the pour starting. */
const HOLD = 180;

/* The cup, drawn rather than photographed: a preloader has to paint before any
   asset has landed. Coordinates are the viewBox's, shared by the outline, the
   clip the coffee is poured into and the rim. */
const CUP = {
  view: "0 0 120 160",
  /** Body: rim line down to a rounded base, the board's paper-cup taper. */
  body: "M20 26 L100 26 L88 150 Q88 158 80 158 L40 158 Q32 158 32 150 Z",
  /** Level travel: base of the inside up to the rim. */
  top: 30,
  base: 156,
};

export interface SitePreloaderProps {
  /** Alpha mask of the wordmark; painted with the foreground. */
  logoMask: string;
  brand: string;
  /** Line over the cup — the block eyebrows' voice. */
  label?: string;
}

/**
 * The site's preloader: a cup filling.
 *
 * The level is the load. It rises on real signals — mount, `document.fonts.ready`,
 * `load` — with a spring between them, so the number under the cup never sits
 * on a figure the page has already passed. `MAX_WAIT` is the backstop: a stalled
 * asset must not hold the door.
 *
 * When it reaches the rim the coffee pours: the level drops away and the panel
 * is cut from the top down at the same rate, so the whole screen leaves as one
 * body of liquid rather than a slab fading out. The two are driven by one
 * spring for exactly that reason — a second timeline would let them separate.
 *
 * Under `prefers-reduced-motion` the panel is never rendered at all: there is
 * nothing here but motion, and a static slab over the page for a second is
 * worse than no panel.
 */
export const SitePreloader = ({
  logoMask,
  brand,
  label = "NOW BREWING",
}: SitePreloaderProps) => {
  const [gone, setGone] = useState(false);
  const [reduced, setReduced] = useState(false);
  const mountedAt = useRef(0);
  const setReady = usePageReady((state) => state.setReady);
  const setRevealing = usePageReady((state) => state.setRevealing);
  const startScroll = useScroll((state) => state.start);
  const stopScroll = useScroll((state) => state.stop);

  const [{ level }, levelApi] = useSpring(() => ({ level: 0, config: FILL }));
  const [{ pour }, pourApi] = useSpring(() => ({ pour: 0, config: POUR }));

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      setReduced(true);
      setReady(true);
      return;
    }

    mountedAt.current = performance.now();
    stopScroll();
    levelApi.start({ level: STEP.mount });

    let timer = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;

      // The pour hangs off the level's own rest rather than a guessed delay, so
      // the cup is always visibly full before it tips.
      levelApi.start({
        level: STEP.loaded,
        onRest: () => {
          const held = Math.max(
            0,
            MIN_VISIBLE - (performance.now() - mountedAt.current),
          );
          timer = window.setTimeout(() => {
            // The first screen starts showing through now, as the panel
            // drains — not when it has finished.
            setRevealing(true);
            pourApi.start({
              pour: 1,
              onRest: () => {
                setGone(true);
                setReady(true);
                startScroll();
              },
            });
          }, held + HOLD);
        },
      });
    };

    document.fonts?.ready.then(() => {
      if (!settled) levelApi.start({ level: STEP.fonts });
    });

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    const cap = window.setTimeout(finish, MAX_WAIT);
    // Belt and braces: whatever happens to the panel, the page must open.
    const release = window.setTimeout(() => setReady(true), MAX_WAIT + 2000);

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(cap);
      window.clearTimeout(release);
      window.clearTimeout(timer);
      startScroll();
    };
  }, [levelApi, pourApi, setReady, setRevealing, startScroll, stopScroll]);

  if (reduced || gone) return null;

  // Surface of what is left in the cup: the level, drained by the pour. Both
  // values feed one interpolation so the two springs cannot come apart.
  const surfaceY = to(
    [level, pour],
    (l, p) => CUP.base - l * (1 - p) * (CUP.base - CUP.top),
  );

  return (
    <animated.div
      aria-hidden="true"
      className="fixed inset-0 z-100 overflow-hidden bg-background px-5 py-5 text-foreground sm:px-10 sm:py-10"
      style={{
        // The panel is cut from the top down, at the pour's own rate.
        clipPath: pour.to((v) => `inset(${v * 100}% 0 0 0)`),
      }}
    >
      {/* Compiles the GPU programs the page below the fold will need, while
          this panel hides the page — see gpu-warmup.tsx. */}
      <GpuWarmup />

      <p className="font-mono text-fine leading-copy tracking-label uppercase text-foreground/45 sm:text-label">
        <span className="tracking-slash">{SLASH}</span>
        <span className="tracking-slash-space"> </span>
        {label}
      </p>

      {/* The count is the screen's one figure, set in the display face the
          block headlines use so the load reads as part of the page. */}
      <animated.p className="mt-2 font-display font-bold text-count-phone leading-display tracking-tight tabular-nums sm:mt-3 sm:text-count-tablet lg:text-count">
        {level.to((v) => `${Math.round(v * 100)}`.padStart(3, "0"))}
      </animated.p>

      {/* The wordmark's mask URL is data, hence the inline style. */}
      <span
        role="img"
        aria-label={brand}
        className="absolute bottom-5 left-5 block h-(--size-logo-height) w-(--size-logo-width) bg-foreground max-sm:h-[1.1rem] max-sm:w-[5.1945rem] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%] sm:bottom-10 sm:left-10"
        style={{ maskImage: `url(${logoMask})` }}
      />

      {/* The cup's base sits on the wordmark's own bottom line: both are hung
          off the same gutter, and the viewBox is trimmed to the cup so the box
          bottom is the base rather than empty space under it. */}
      <svg
        viewBox={CUP.view}
        className="pointer-events-none absolute bottom-5 right-5 h-[34vh] max-h-120 w-auto sm:bottom-10 sm:right-10 sm:h-[52vh]"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="preloader-cup">
            <path d={CUP.body} />
          </clipPath>
          <linearGradient id="preloader-coffee" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-coffee-crema)" />
            <stop offset="1" stopColor="var(--color-coffee-deep)" />
          </linearGradient>
        </defs>

        <g clipPath="url(#preloader-cup)">
          <animated.rect
            x="0"
            width="120"
            height="220"
            fill="url(#preloader-coffee)"
            y={surfaceY}
          />
        </g>

        <path
          d={CUP.body}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 26 H106"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </animated.div>
  );
};
