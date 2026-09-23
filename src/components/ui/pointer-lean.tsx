"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useWindowWidth } from "@/hooks/use-window-size";
import { isMobileDisabled, springsConfig } from "@/lib/springs/config";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/* The defaults are the dial cup's own numbers, so anything that opts in gets
   that treatment verbatim; a call site that wants a quieter version passes a
   smaller `tilt`. See `locations/locations-cup.tsx`, which keeps its own copy
   because it also carries two scroll springs on the same subject. */
const CUP_TILT = 14;
const CUP_PERSPECTIVE = 900;
const CUP_SPRING = { tension: 90, friction: 22 };

export interface PointerLeanProps {
  children: ReactNode;
  /** Degrees of lean on each axis at the edge of the tracked area. */
  tilt?: number;
  /** Spring the lean rides. Defaults to the dial cup's. */
  config?: { tension: number; friction: number };
  /** Pixels the subject drifts toward the pointer on top of the rotation. */
  drift?: number;
  /** How deep the perspective reads, in px. */
  perspective?: number;
  /**
   * What the pointer is measured against: a selector for an ancestor, or
   * `"self"` for this element's own box. A card in a row takes itself, so the
   * four answer the pointer separately; a full-bleed subject takes the section.
   */
  scope?: string;
  className?: string;
  /** The layer that actually carries the transform. */
  innerClassName?: string;
}

/**
 * Leans its subject toward the pointer, as if you were looking at an object on
 * a table rather than at a photograph.
 *
 * There is no primitive for this in `components/animation/springs/`: `<Hover>`
 * only knows enter and leave, not where the cursor is, so — like the dial's cup,
 * which predates this and stays on its own copy because it also carries two
 * scroll springs — this talks to `@react-spring/web` directly. It is off
 * wherever hover is, so a touch screen never pays for the listener.
 *
 * Rotation and drift ride one spring on one element; the perspective sits on the
 * parent, because a perspective that moves with the subject is not depth.
 *
 * Reduced motion turns the whole thing off rather than shortening it. The global
 * `skipAnimation` that `<ReducedMotion>` sets would resolve this spring
 * instantly, so the subject would snap to every pointer sample with no easing at
 * all — worse than not leaning. The flag is read here as tri-state for the same
 * reason `PulseDot` does: nothing is armed until the query has been answered.
 */
export const PointerLean = ({
  children,
  tilt = CUP_TILT,
  drift = 0,
  perspective = CUP_PERSPECTIVE,
  config = CUP_SPRING,
  scope = "section",
  className,
  innerClassName = "size-full",
}: PointerLeanProps) => {
  const frame = useRef<HTMLDivElement>(null);
  const viewportWidth = useWindowWidth();
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const disabled =
    reduced !== false ||
    isMobileDisabled(springsConfig.disableOnMobile.hover, viewportWidth);

  const [lean, leanApi] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    x: 0,
    y: 0,
    config,
  }));

  useEffect(() => {
    const area =
      scope === "self"
        ? frame.current
        : frame.current?.closest<HTMLElement>(scope);
    if (!area || disabled) return;

    const clamp = (value: number) => Math.max(-1, Math.min(1, value));

    const onMove = (event: PointerEvent) => {
      const box = area.getBoundingClientRect();
      const dx = clamp(
        (event.clientX - (box.left + box.width / 2)) / (box.width / 2),
      );
      const dy = clamp(
        (event.clientY - (box.top + box.height / 2)) / (box.height / 2),
      );
      leanApi.start({
        rotateY: dx * tilt,
        rotateX: -dy * tilt,
        x: dx * drift,
        y: dy * drift,
      });
    };
    const onLeave = () => leanApi.start({ rotateX: 0, rotateY: 0, x: 0, y: 0 });

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    return () => {
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
    };
  }, [leanApi, disabled, scope, tilt, drift]);

  return (
    <div
      ref={frame}
      className={className}
      style={{ perspective: `${perspective}px` }}
    >
      <animated.div
        className={`${innerClassName} [transform-style:preserve-3d]`}
        style={lean}
      >
        {children}
      </animated.div>
    </div>
  );
};
