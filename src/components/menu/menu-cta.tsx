"use client";

// 📖 Design source: Figma 2149:5 (node 2149:31) + hover board 2229:145 (node 2229:207)

import Image from "next/image";
import { useState } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { Spring } from "@/components/animation/springs/spring";
import { CtaLink } from "@/components/ui/cta-link";

export interface MenuCtaProps {
  cta: { label: string; href: string };
  receipt: { src: string; width: number; height: number };
}

/**
 * "View full menu" plus the receipt that slides in behind it on hover.
 *
 * The two are one component because the receipt is anchored to the section, not
 * to the link, yet the link owns the hover state. They render in the design's
 * z-order — receipt first, so the cards below still paint over it.
 *
 * Only the entrance translation is animated; the receipt's own tilt stays a
 * static token on the inner element, so the spring translates in screen space
 * and the sheet slides in from the bottom-right rather than along its own axis.
 */
export const MenuCta = ({ cta, receipt }: MenuCtaProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Spring
        tag="span"
        enabled={hovered}
        from={{ x: 150, y: 150, opacity: 0 }}
        to={{ x: 0, y: 0, opacity: 1 }}
        config={{ tension: 120, friction: 26 }}
        aria-hidden="true"
        className="pointer-events-none absolute left-(--size-menu-receipt-x) top-(--size-menu-receipt-y) hidden h-(--size-menu-receipt-height) w-(--size-menu-receipt-width) lg:block"
      >
        <span className="block size-full [rotate:var(--angle-menu-receipt)]">
          <Image
            src={receipt.src}
            alt=""
            width={receipt.width}
            height={receipt.height}
            className="size-full object-cover"
          />
        </span>
      </Spring>

      <Inview
        tag="span"
        mode="once"
        from={{ opacity: 0, y: 12 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={420}
        /* Right-anchored, not placed by its board x: the board puts its right edge on
             the 40px gutter, and once the type scale is damped a fixed left would
             push it past the frame. */
        className="block sm:max-lg:justify-self-end lg:absolute lg:right-10 lg:top-(--size-menu-cta-y)"
      >
        <CtaLink
          label={cta.label}
          href={cta.href}
          onHoverChange={setHovered}
          className="w-(--size-menu-cta) text-foreground-inverse"
          ruleClassName="bg-foreground-inverse"
        />
      </Inview>
    </>
  );
};
