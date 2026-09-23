"use client";

// 📖 Design source: Figma "Block 3_v2" 2164:283 (nodes 2188:739, 2188:737, 2188:738)

import { Inview } from "@/components/animation/springs/in-view";
import { PulseDot } from "@/components/common/header";
import { DigitRoll } from "@/components/ui/digit-roll";

export interface LocationsInfoProps {
  eyebrow: string;
  /** Each address is already split into its rendered lines. */
  addresses: string[][];
  hours: string[];
}

/**
 * The three text groups around the dial: the eyebrow, the address column and
 * the opening hours. The eyebrow's dot is the same `<PulseDot>` the header uses
 * for ORDER ONLINE, so both blink in step.
 */
export const LocationsInfo = ({
  eyebrow,
  addresses,
  hours,
}: LocationsInfoProps) => {
  return (
    <>
      <Inview
        tag="p"
        mode="once"
        from={{ clipPath: "inset(0 100% 0 0)" }}
        to={{ clipPath: "inset(0 0 0 0)" }}
        config={{ tension: 46, friction: 26 }}
        className="order-first flex items-center gap-1.5 font-mono text-label leading-copy tracking-tight text-foreground-inverse sm:text-base max-lg:order-1 max-lg:col-start-1 lg:absolute lg:left-10 lg:top-(--size-locations-dial-y)"
      >
        <PulseDot className="size-(--size-dot) shrink-0 rounded-full bg-accent" />
        {eyebrow}
      </Inview>

      {/* One spring per address rather than one for the column: three shops are
          a list, and a list that arrives together reads as a single block. */}
      <ul className="grid grid-cols-1 gap-5 font-mono text-base leading-copy tracking-tight uppercase text-foreground-inverse sm:grid-cols-3 max-lg:order-4 max-lg:col-span-2 lg:absolute lg:bottom-9.75 lg:left-10 lg:top-auto lg:flex board:bottom-auto board:top-(--size-locations-list-y) lg:w-(--size-locations-list) lg:flex-col lg:gap-6">
        {addresses.map((lines, index) => (
          <Inview
            key={lines.join(" ")}
            tag="li"
            mode="once"
            from={{ clipPath: "inset(0 100% 0 0)" }}
            to={{ clipPath: "inset(0 0 0 0)" }}
            config={{ tension: 80, friction: 26 }}
            delayIn={160 + index * 110}
          >
            <address className="not-italic">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </Inview>
        ))}
      </ul>

      <Inview
        tag="p"
        mode="once"
        from={{ clipPath: "inset(0 100% 0 0)" }}
        to={{ clipPath: "inset(0 0 0 0)" }}
        config={{ tension: 46, friction: 26 }}
        delayIn={280}
        className="font-mono text-base leading-copy tracking-tight uppercase text-foreground-inverse max-lg:order-2 max-lg:col-start-2 max-lg:justify-self-end max-lg:text-right lg:absolute lg:bottom-6 lg:right-10 lg:top-auto lg:w-(--size-hours) lg:text-right board:bottom-auto board:top-(--size-locations-hours-y)"
      >
        {hours.map((line) => (
          <span key={line} className="block">
            <DigitRoll value={line} delayIn={360} />
          </span>
        ))}
      </Inview>
    </>
  );
};
