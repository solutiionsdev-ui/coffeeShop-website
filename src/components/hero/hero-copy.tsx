"use client";

// 📖 Design source: Figma "Concept 7" 1276:566 (node 1312:290)

import { easings } from "@react-spring/web";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CtaLink } from "@/components/ui/cta-link";
import { usePageReady } from "@/hooks/use-page-ready";

export interface HeroCopyProps {
  /** Eyebrow is split so the "//" prefix keeps its own negative tracking. */
  eyebrow: { slash: string; label: string };
  headline: string;
  /** Script accent overlapping the headline's last line. */
  script: string;
  lede: string;
  cta: { label: string; href: string };
}

/**
 * The left-hand copy column.
 *
 * On the desktop board it is centred on the frame with a 28px rise and sits at
 * a fixed width; below that it is a plain column in the flow, so the block can
 * distribute what height the device actually has instead of being pinned to a
 * measurement taken from an 800px-tall frame.
 *
 * The script accent overlaps the headline's last line at every width — it shares
 * one grid cell with the headline and is pushed into place by its own offsets,
 * which are re-cut per grid base rather than scaled from the desktop pair.
 */
export const HeroCopy = ({
  eyebrow,
  headline,
  script,
  lede,
  cta,
}: HeroCopyProps) => {
  // Held until the preloader is gone — see usePageReady.
  const ready = usePageReady((state) => state.ready);

  return (
    <div className="order-1 flex w-full shrink-0 flex-col gap-4 text-foreground sm:max-lg:gap-[0.6875rem] sm:my-auto sm:max-lg:mb-auto sm:max-lg:mt-0 sm:w-(--size-hero-copy-tablet) sm:gap-5 lg:absolute lg:my-0 lg:left-10 lg:top-[calc(50%-var(--size-hero-copy-rise))] lg:w-(--size-hero-copy) lg:-translate-y-1/2 lg:gap-6">
      <div className="grid justify-items-start">
        <div className="col-start-1 row-start-1 flex flex-col gap-3 uppercase max-sm:gap-5 sm:gap-4 lg:gap-5">
          <Inview
            tag="p"
            mode="once"
            enabled={ready}
            from={{ opacity: 0, y: 10 }}
            to={{ opacity: 1, y: 0 }}
            config={{ tension: 90, friction: 26 }}
            className="font-mono text-fine leading-copy tracking-label sm:text-label"
          >
            <span className="tracking-slash">{eyebrow.slash}</span>
            <span className="tracking-slash-space"> </span>
            {eyebrow.label}
          </Inview>

          <TextEngine
            tag="h1"
            mode="once"
            enabled={ready}
            className="justify-start text-left font-display font-bold text-display-phone leading-display tracking-tight max-sm:text-display-hero-phone sm:text-display-tablet sm:max-lg:text-display-hero-tablet lg:text-display"
            wrapLineClassName="-my-[0.1em]"
            columnGap={0.2}
            lineIn={{ y: "0%", opacity: 1 }}
            lineOut={{ y: "110%", opacity: 0 }}
            lineStagger={90}
            lineConfig={{ duration: 900, easing: easings.easeOutCubic }}
            overflow
          >
            {headline}
          </TextEngine>
        </div>

        {/* Allura is joined-up, so the accent is never split into glyphs — a
            single clip sweeps left to right and the word writes itself. The
            insets are negative on three sides so the swashes stay outside the
            clip and no stroke is trimmed. */}
        <Inview
          tag="p"
          mode="once"
          enabled={ready}
          from={{ clipPath: "inset(-12% 100% -22% -4%)" }}
          to={{ clipPath: "inset(-12% -8% -22% -4%)" }}
          config={{ tension: 36, friction: 26 }}
          delayIn={420}
          className="col-start-1 row-start-1 ml-(--size-hero-script-x-phone) mt-(--size-hero-script-y-phone) w-max whitespace-nowrap font-script text-script-phone leading-headline tracking-tight sm:ml-(--size-hero-script-x-tablet) sm:mt-(--size-hero-script-y-tablet) sm:text-script-tablet lg:ml-(--size-hero-script-x) lg:mt-(--size-hero-script-y) lg:text-script"
        >
          {script}
        </Inview>
      </div>

      <div className="flex w-full flex-col gap-6 max-sm:w-[17rem] max-sm:gap-9 sm:w-80 sm:gap-8 sm:max-lg:gap-[2.375rem] lg:w-66 lg:gap-10">
        <TextEngine
          tag="p"
          mode="once"
          enabled={ready}
          className="w-full justify-start text-left font-display font-bold text-base leading-copy tracking-tight sm:max-lg:text-lede-tablet"
          columnGap={0.2}
          wordIn={{ y: 0, opacity: 1 }}
          wordOut={{ y: 16, opacity: 0 }}
          wordStagger={18}
          wordConfig={{ duration: 650, easing: easings.easeOutQuart }}
          delayIn={260}
        >
          {lede}
        </TextEngine>

        {/* Inview types its props as HTMLAttributes, so the anchor lives inside
            the animated wrapper rather than being the animated element itself. */}
        <Inview
          tag="span"
          mode="once"
          enabled={ready}
          from={{ opacity: 0, y: 12 }}
          to={{ opacity: 1, y: 0 }}
          config={{ tension: 90, friction: 26 }}
          delayIn={520}
          className="block"
        >
          <CtaLink
            label={cta.label}
            href={cta.href}
            className="w-(--size-hero-cta)"
          />
        </Inview>
      </div>
    </div>
  );
};
