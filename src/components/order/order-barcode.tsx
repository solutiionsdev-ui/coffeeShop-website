"use client";

import { animated, useSpring } from "@react-spring/web";

import { RECEIPT } from "./receipt-spec";

/**
 * How the run settles: every bar starts at its own height and they all come to
 * the same line, left to right. `span` is how much of the sweep one bar takes,
 * so the smaller it is the tighter the wave.
 *
 * The ragged state is the *start*, not the finish. Going the other way — a flat
 * code growing taller and settling down — is invisible here: the printed code is
 * uniform, so anything above full height is clipped by the row and every bar
 * looks identical until it lands. This way the skyline is jagged while the wave
 * passes and the code ends up exactly as the board draws it.
 */
const SETTLE = { floor: 0.42, ceiling: 0.94, span: 0.55, seed: 90210 };

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * Bar widths from a fixed seed, so the code is identical on every render and
 * never flickers when React re-renders the receipt mid-scroll.
 *
 * The run is generated until it fills the paper's content width rather than to
 * a fixed count: a fixed count left a bald strip at the right-hand end, which no
 * printed code has. The last bar takes whatever is left and is always inked, so
 * the code closes on a bar the way a real one does.
 */
const barcodeBars = () => {
  const span = RECEIPT.width - RECEIPT.paddingX * 2;
  let s = RECEIPT.barcode.seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const bars: { key: number; width: number; on: boolean }[] = [];
  let left = span;
  let key = 0;

  while (left > 0) {
    const width = next() < 0.55 ? RECEIPT.barcode.thin : RECEIPT.barcode.thick;
    const on = next() > 0.22;

    if (left <= width + RECEIPT.barcode.gap) {
      bars.push({ key: key++, width: left, on: true });
      break;
    }

    bars.push({ key: key++, width, on });
    left -= width + RECEIPT.barcode.gap;
  }

  return bars;
};

/**
 * Each bar's starting height, on its own seed so the printed code — widths and
 * inking, which come off RECEIPT.barcode.seed — is byte-for-byte unchanged.
 */
const startHeights = (count: number) => {
  let s = SETTLE.seed >>> 0;
  return Array.from({ length: count }, () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const r = s / 4294967296;
    return SETTLE.floor + r * (SETTLE.ceiling - SETTLE.floor);
  });
};

/** Height multiplier for bar `i` at sweep position `v`. */
const scaleAt = (v: number, i: number, count: number, from: number) => {
  const t0 = (i / count) * (1 - SETTLE.span);
  const local = clamp((v - t0) / SETTLE.span, 0, 1);
  const eased = 1 - Math.pow(1 - local, 3);
  return from + (1 - from) * eased;
};

export interface OrderBarcodeProps {
  /** True once the feed has pushed the code clear of the printer's slot. */
  fed: boolean;
}

/**
 * The receipt's barcode, settling to its printed height.
 *
 * One spring drives the whole run and every bar interpolates its own height off
 * it — a hundred-odd springs would be a hundred-odd subscriptions for a single
 * gesture. The sweep is gated on the paper feed rather than on an intersection
 * observer: the code lives inside the print window, so an observer fires while
 * it is still hidden behind the printer and the settle would be over before
 * anything of it were visible.
 *
 */
export const OrderBarcode = ({ fed }: OrderBarcodeProps) => {
  const bars = barcodeBars();
  const from = startHeights(bars.length);

  const [{ sweep }] = useSpring(
    () => ({
      sweep: fed ? 1 : 0,
      config: { tension: 70, friction: 34 },
    }),
    [fed],
  );

  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: RECEIPT.barcode.gap,
        height: RECEIPT.barcode.height,
      }}
    >
      {bars.map((b, i) => (
        <animated.span
          key={b.key}
          style={{
            width: b.width,
            height: "100%",
            background: b.on ? RECEIPT.ink : "transparent",
            transformOrigin: "bottom center",
            transform: sweep.to(
              (v) => `scaleY(${scaleAt(v, i, bars.length, from[i])})`,
            ),
          }}
        />
      ))}
    </div>
  );
};
