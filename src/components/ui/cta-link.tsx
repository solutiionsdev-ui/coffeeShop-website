"use client";

import Link from "next/link";
import { useRef } from "react";

import { Hover } from "@/components/animation/springs/hover";
import { ArrowGlyph } from "@/components/ui/arrow-glyph";

export interface CtaLinkProps {
  label: string;
  href: string;
  /** Block sizing and colour from the caller — each board frames it differently. */
  className?: string;
  /** Paints the rule; the light boards run on the inverse foreground. */
  ruleClassName?: string;
  /** The menu board hangs its receipt off the same hover. */
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * The text CTA the hero and the menu board share: label, arrow, hairline rule.
 *
 * Two things move on hover, both off the link itself rather than off their own
 * elements — one `trigger` keeps them in step even when the pointer crosses the
 * gap between the label and the rule:
 *
 * - the arrow leaves to the right while a second one enters from the left, so
 *   the glyph reads as travelling rather than nudging;
 * - the rule retracts to the right and is redrawn from the left.
 *
 * The rule's two halves return `immediate`, which is invisible: the end of the
 * hover (retracted base, drawn overlay) and the resting state (drawn base,
 * retracted overlay) paint exactly the same pixels.
 */
export const CtaLink = ({
  label,
  href,
  className,
  ruleClassName = "bg-foreground",
  onHoverChange,
}: CtaLinkProps) => {
  const trigger = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={trigger}
      href={href}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      className={`flex h-(--size-cta-block) flex-col justify-between max-sm:w-max ${className ?? ""}`}
    >
      {/* The design trims the label to its cap height, so the row carries an
          explicit height rather than the font's line box. */}
      <span className="flex h-(--size-cap-16) items-center gap-4">
        <span className="whitespace-nowrap font-display font-bold text-label leading-flush uppercase sm:text-base sm:max-lg:text-lede-tablet">
          {label}
        </span>

        {/* Keeps ArrowGlyph's own 8px footprint, so the row is unchanged. */}
        <span className="relative flex size-2 flex-none items-center justify-center">
          <Hover
            tag="span"
            trigger={trigger}
            from={{ transform: "translateX(0%)", opacity: 1 }}
            to={{ transform: "translateX(190%)", opacity: 0 }}
            config={{ tension: 200, friction: 28 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ArrowGlyph />
          </Hover>
          <Hover
            tag="span"
            trigger={trigger}
            from={{ transform: "translateX(-190%)", opacity: 0 }}
            to={{ transform: "translateX(0%)", opacity: 1 }}
            config={{ tension: 200, friction: 28 }}
            delayIn={70}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ArrowGlyph />
          </Hover>
        </span>
      </span>

      <span
        aria-hidden="true"
        className="relative block h-(--size-underline) w-full"
      >
        <Hover
          tag="span"
          trigger={trigger}
          immediateOut
          from={{ transform: "scaleX(1)" }}
          to={{ transform: "scaleX(0)" }}
          config={{ tension: 260, friction: 30 }}
          style={{ transformOrigin: "right center" }}
          className={`absolute inset-0 block ${ruleClassName}`}
        />
        <Hover
          tag="span"
          trigger={trigger}
          immediateOut
          delayIn={140}
          from={{ transform: "scaleX(0)" }}
          to={{ transform: "scaleX(1)" }}
          config={{ tension: 170, friction: 26 }}
          style={{ transformOrigin: "left center" }}
          className={`absolute inset-0 block ${ruleClassName}`}
        />
      </span>
    </Link>
  );
};
