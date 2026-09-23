"use client";

// 📖 Design source: Figma 1276:566 / 2149:5 (node 1312:289 / 2149:24)

import { animated, easings, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Opacity the dot dips to at the bottom of each pulse. */
const DIM_OPACITY = 0.15;
/** Duration of one half of the pulse, in ms. */
const PULSE_DURATION = 700;

export interface PulseDotProps {
  className?: string;
}

/**
 * The ORDER ONLINE status dot, pulsing on a loop. Amber on both themes.
 *
 * A steady blink is periodic, so it runs on a duration-eased `useSpring` with
 * react-spring's own `loop` rather than a physical spring (which would give an
 * uneven beat) — still `@react-spring/web`, still no keyframes.
 *
 * `reduced` is deliberately tri-state. `<ReducedMotion>` sets react-spring's
 * global `skipAnimation`, which resolves every spring instantly; a looping
 * spring under that flag re-fires forever and locks the main thread. Starting
 * from `null` means the loop is only ever armed once the media query has
 * actually been read, so the hot loop cannot happen on the first render.
 */
export const PulseDot = ({ className }: PulseDotProps) => {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const pulsing = reduced === false;

  const styles = useSpring({
    from: { opacity: 1 },
    to: { opacity: pulsing ? DIM_OPACITY : 1 },
    loop: pulsing ? { reverse: true } : false,
    config: { duration: PULSE_DURATION, easing: easings.easeInOutSine },
    immediate: !pulsing,
  });

  return (
    <animated.span aria-hidden="true" className={className} style={styles} />
  );
};
