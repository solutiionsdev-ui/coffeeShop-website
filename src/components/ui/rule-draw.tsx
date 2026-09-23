"use client";

import type { CSSProperties } from "react";

import { Inview } from "@/components/animation/springs/in-view";

export interface RuleDrawProps {
  /** `x` draws left to right, `y` draws top to bottom. */
  axis?: "x" | "y";
  className?: string;
  style?: CSSProperties;
  delayIn?: number;
}

/**
 * A hairline that draws itself in when it scrolls into view.
 *
 * It is one `scaleX`/`scaleY` off an anchored origin, so the rule keeps its
 * painted thickness at every step — scaling a 1px line along its own length
 * never touches its cross-axis. The element is decorative in every call site,
 * hence the unconditional `aria-hidden`.
 */
export const RuleDraw = ({
  axis = "x",
  className,
  style,
  delayIn = 0,
}: RuleDrawProps) => (
  <Inview
    tag="span"
    mode="once"
    aria-hidden="true"
    from={{ transform: axis === "x" ? "scaleX(0)" : "scaleY(0)" }}
    to={{ transform: axis === "x" ? "scaleX(1)" : "scaleY(1)" }}
    config={{ tension: 55, friction: 22 }}
    delayIn={delayIn}
    className={className}
    style={{
      transformOrigin: axis === "x" ? "left center" : "center top",
      ...style,
    }}
  />
);
