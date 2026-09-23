"use client";

// 📖 Design source: Figma "Concept 7" 1276:566 (node 2161:207)

import { Inview } from "@/components/animation/springs/in-view";
import { DigitRoll } from "@/components/ui/digit-roll";
import { RuleDraw } from "@/components/ui/rule-draw";
import { UnderlineLink } from "@/components/ui/underline-link";
import { usePageReady } from "@/hooks/use-page-ready";

export interface HeroInfoLink {
  label: string;
  href: string;
}

export interface HeroInfoBarProps {
  hours: string[];
  address: string[];
  social: HeroInfoLink[];
}

/** Drawn top-down as the bar arrives, after the copy has landed. */
const Rule = ({
  delayIn,
  className,
}: {
  delayIn: number;
  className?: string;
}) => {
  return (
    <RuleDraw
      axis="y"
      delayIn={delayIn}
      className={`block h-(--size-hero-rule) w-px shrink-0 bg-foreground/35 ${className ?? ""}`}
    />
  );
};

/**
 * Bottom strip: opening hours, street address and social handles, separated by
 * hairline rules. Pinned to the frame's bottom gutter rather than to the copy,
 * so it stays on the baseline at any viewport height.
 *
 * The handles drop on a phone. Three groups and two rules do not fit across 360
 * without shrinking the type past reading size, and of the three the handles are
 * the one that is repeated verbatim in the footer — the hours and the address
 * are not.
 */
export const HeroInfoBar = ({ hours, address, social }: HeroInfoBarProps) => {
  const ready = usePageReady((state) => state.ready);

  return (
    <aside
      aria-label="Visit us"
      className="order-3 relative z-10 flex shrink-0 items-center gap-4 pt-4 max-sm:mt-auto font-mono text-label leading-copy tracking-tight uppercase text-foreground sm:gap-6 sm:pt-6 sm:text-base lg:absolute lg:pt-0 lg:bottom-10 lg:left-10 lg:mt-0 lg:gap-8"
    >
      {/* Once the still fills the lower half of this grid the bar sits on the
          bag rather than the plinth, and white on cream does not read. A short
          scrim under it — the same device block 5 uses below the board. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -bottom-10 -top-6 -z-10 hidden bg-linear-to-t from-background/95 via-background/78 to-transparent sm:max-lg:block"
      />

      {/* The bar assembles left to right — each group in turn, with the rules
          drawing in between them — rather than arriving as one strip. */}
      <Inview
        tag="p"
        mode="once"
        enabled={ready}
        from={{ opacity: 0, y: 16 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={620}
        className="w-max lg:w-(--size-hours)"
      >
        {hours.map((line) => (
          <span key={line} className="block">
            <DigitRoll value={line} delayIn={760} />
          </span>
        ))}
      </Inview>

      <Rule delayIn={700} />

      <Inview
        tag="address"
        mode="once"
        enabled={ready}
        from={{ opacity: 0, y: 16 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={760}
        className="w-max not-italic lg:w-(--size-hero-address)"
      >
        {address.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </Inview>

      <Rule delayIn={840} className="hidden sm:block" />

      <Inview
        tag="ul"
        mode="once"
        enabled={ready}
        from={{ opacity: 0, y: 16 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={900}
        className="hidden w-max flex-col sm:flex lg:w-(--size-hero-social)"
      >
        {social.map((item) => (
          <li key={item.label}>
            <UnderlineLink href={item.href}>{item.label}</UnderlineLink>
          </li>
        ))}
      </Inview>
    </aside>
  );
};
