"use client";

import { Inview } from "@/components/animation/springs/in-view";

/** One column per digit; the stack inside it is ten of these tall. */
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const hasDigit = (value: string) => /\d/.test(value);

export interface DigitRollProps {
  /** The finished string. Digits roll into place; everything else is printed. */
  value: string;
  /** ms between neighbouring digits. */
  stagger?: number;
  delayIn?: number;
  className?: string;
}

/**
 * Numbers that roll to their value, the way a printed counter lands.
 *
 * The visible glyphs never take part in layout: a transparent copy of the string
 * holds the box and the baseline, and the rolling columns sit on top of it, out
 * of flow. That copy is what a screen reader reads, and it is also why the row's
 * height and baseline are exactly what they were before the roll was added.
 *
 * Both call sites render in `font-mono`, so every cell in the overlay is the
 * same width as the character it covers — the overlay needs no measuring.
 */
export const DigitRoll = ({
  value,
  stagger = 70,
  delayIn = 0,
  className,
}: DigitRollProps) => {
  if (!hasDigit(value)) {
    return <span className={className}>{value}</span>;
  }

  let step = 0;

  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      {/* Transparent, not hidden: it stays in the accessibility tree and is
          still selectable, so the number can be copied out of the page. */}
      <span className="opacity-0">{value}</span>

      {/* Taller than the line box on purpose. It is out of flow, so the extra
          room costs no layout, and it gives each digit clearance from the clip
          edge instead of shaving its top and bottom off. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -inset-y-[0.35em] flex"
      >
        {Array.from(value).map((char, index) => {
          if (!/\d/.test(char)) {
            // Not a flex box: a flex container drops a whitespace-only child,
            // which would collapse every space in the string to zero width.
            return (
              <span
                key={`${char}-${index}`}
                className="flex-none self-center whitespace-pre"
              >
                {char}
              </span>
            );
          }

          const order = step++;

          return (
            <span
              key={`${char}-${index}`}
              className="relative flex-none [clip-path:inset(0)]"
            >
              {/* Ten cells tall, so one cell is exactly the column's height and
                  a 10% step lands the next digit on the same spot. */}
              <Inview
                tag="span"
                mode="once"
                from={{ transform: "translateY(0%)" }}
                to={{ transform: `translateY(-${Number(char) * 10}%)` }}
                config={{ tension: 90, friction: 26 }}
                delayIn={delayIn + order * stagger}
                className="block h-[1000%]"
              >
                {DIGITS.map((digit) => (
                  <span
                    key={digit}
                    className="flex h-[10%] items-center justify-center"
                  >
                    {digit}
                  </span>
                ))}
              </Inview>
            </span>
          );
        })}
      </span>
    </span>
  );
};
