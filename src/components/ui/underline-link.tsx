"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { Hover } from "@/components/animation/springs/hover";

export interface UnderlineLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Colour of the hairline; follows the text unless a call site overrides it. */
  ruleClassName?: string;
  /**
   * Whether the hairline is drawn at all. The header's nav turns it off: that
   * row arrives under a clip that sweeps across it, and the clip's own bottom
   * edge falls exactly on the label's, so the rule below the baseline is cut
   * away — on a fractional device pixel ratio a sliver of it survives and every
   * label picks up a faint, broken underline. The roll is that row's hover.
   */
  rule?: boolean;
}

/** How the two halves of the roll travel. Crisp, with no overshoot to read as slip. */
const ROLL = { tension: 260, friction: 30 };

/**
 * A navigation link whose label rolls over on hover while a rule draws in.
 *
 * The roll is the same gesture the numbers already make — the clock, the card
 * indices and the prices all turn their digits over inside a clip. Spending it
 * on words too is what makes the navigation part of the same machine rather
 * than a set of links with a generic underline: the label leaves upward and its
 * double arrives from below, both on one `trigger` so they cannot drift apart.
 *
 * The visible copy is the real one; the arriving half is the duplicate and is
 * hidden from assistive tech, so the link still reads as a single label.
 *
 * The rule takes `currentColor`, which is what lets it sit on both the dark and
 * the light board without a second token.
 */
export const UnderlineLink = ({
  href,
  children,
  className,
  ruleClassName = "bg-current",
  rule = true,
}: UnderlineLinkProps) => {
  const trigger = useRef<HTMLAnchorElement>(null);

  return (
    <Link ref={trigger} href={href} className={className}>
      {/* The rule hangs off an inner box rather than the link itself: several
          call sites place the link absolutely, and forcing `relative` on it
          would turn their `left`/`top` into an offset from the flow instead. */}
      <span className="relative inline-block">
        {/* The clip is its own box so the rule, which sits a pixel below the
            baseline, is not shaved off by it — and it clips with `clip-path`
            rather than `overflow`, because an inline-block that hides its
            overflow takes its baseline from its bottom margin edge instead of
            its text, which dropped the separators between the footer's links. */}
        <span className="relative block [clip-path:inset(0)]">
          <Hover
            tag="span"
            trigger={trigger}
            from={{ transform: "translateY(0%)" }}
            to={{ transform: "translateY(-100%)" }}
            config={ROLL}
            className="block"
          >
            {children}
          </Hover>

          <Hover
            tag="span"
            trigger={trigger}
            aria-hidden="true"
            from={{ transform: "translateY(100%)" }}
            to={{ transform: "translateY(0%)" }}
            config={ROLL}
            className="absolute inset-0 block"
          >
            {children}
          </Hover>
        </span>

        {/* Opacity rides along with the scale rather than the scale carrying it
            alone: a hairline collapsed to `scaleX(0)` still composites, and on a
            fractional device pixel ratio it left a faint rule showing under
            every label at rest. Nothing to see means nothing painted. */}
        {rule && (
          <Hover
            tag="span"
            trigger={trigger}
            aria-hidden="true"
            from={{ transform: "scaleX(0)", opacity: 0 }}
            to={{ transform: "scaleX(1)", opacity: 1 }}
            config={{ tension: 220, friction: 28 }}
            style={{ transformOrigin: "left center" }}
            className={`absolute inset-x-0 -bottom-px block h-px ${ruleClassName}`}
          />
        )}
      </span>
    </Link>
  );
};
