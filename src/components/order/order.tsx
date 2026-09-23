"use client";

// 📖 Block 5 — a thermal printer feeding a receipt out of its slot as you scroll.
// The photograph drifts in on a parallax as the block arrives, then holds still
// while the receipt feeds: nothing else in the frame moves.

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";

import { OrderCopy, type OrderCopyProps } from "./order-copy";
import { OrderReceipt, RECEIPT, type OrderReceiptProps } from "./order-receipt";

/* ════════════ TUNING — everything adjustable lives here ════════════ */

/** The board's coordinate system. BG.webp is exactly this size. */
const SCENE = { width: 1440, height: 800 };

/**
 * Scroll track length. 100 = the block is exactly one screen and never pins:
 * the receipt feeds while the block rises into view and is fully out the
 * moment the block fills the screen, after which it simply scrolls on into
 * the footer — no pinned travel, so no pause. Over 100 would pin the stage for
 * the difference with nothing left to feed.
 */
const TRACK_VH = 100;

/** Printer feed steps — the receipt advances in this many jerks, not smoothly. */
const STEPS = 46;
/**
 * Feed progress at which the barcode has cleared the printer's slot. Below it
 * the code is still behind the housing, so its settle would play unseen.
 */
const BARCODE_FED = 0.88;
/**
 * Background parallax: how far the photograph lags behind the frame as the
 * block scrolls in, as a fraction of the frame's height. The photograph is
 * made that much taller than the frame so the lag never opens a gap, and it
 * lands flush with the frame's top as the block reaches the top of the screen.
 * Bigger = stronger parallax, at the cost of cropping the photograph's sides.
 */
const BG_PARALLAX = 0.3;

/**
 * Where the paper starts to appear and where it is fully out, in viewport
 * heights of scroll measured from the moment the block's top reaches the top
 * of the screen. -0.85: the feed begins once the printer has risen into view;
 * 0: it ends as the block fills the screen.
 */
const START_VH = -0.85;
const END_VH = 0;
/** >1 eases the feed out toward the end. */
const EASE_POWER = 1.6;

/**
 * Clipping window. Its TOP EDGE is the slot line — the paper emerges from the
 * middle of the bar and then hangs in FRONT of the bar's lower lip, so the bar
 * sits behind it (z-index 1 against the window's 2). Only the slot's own upper
 * edge hides anything, and that is the window's clip, not the art.
 *
 * `height` runs to the bottom of the scene rather than the board's quoted 572.
 * The window also clips the paper's shadow, so stopping it short of the scene
 * cut the shadow off against a straight edge a few pixels under the torn one.
 */
const PRINT_WINDOW = {
  left: 553,
  top: 176,
  width: 328,
  get height() {
    return SCENE.height - this.top;
  },
};

/** Printer art, in its own pixels. Its slot sits at y 36–44 of the 72. */
const PRINTER_ART = { width: 404, height: 72 };

/**
 * The printer bar, in scene px. `height` comes from the art's aspect rather than
 * the board's quoted 46 — the asset is 404×72 and squashing it distorts the
 * slot. At width 400 the bar is ~71 tall, putting its slot at y≈169–176, flush
 * with PRINT_WINDOW.top. The bar is 400 wide against the paper's 328, so its
 * lower lip stays visible either side of the sheet.
 */
const PRINTER = {
  left: 519,
  top: 133,
  width: 400,
  get height() {
    return (this.width * PRINTER_ART.height) / PRINTER_ART.width;
  },
};

/**
 * Shadow under the paper, scaled by progress.
 *
 * `drop-shadow`, not `box-shadow`: the paper's bottom edge is torn, and a box
 * shadow follows the border box, so it drew a straight bar of shadow across the
 * teeth instead of tracing them.
 */
const SHADOW = { y: 26, blur: 20, color: "rgba(0, 0, 0, 0.42)" };

/**
 * Below the desktop board the stage stops covering the viewport.
 *
 * Covering a portrait phone with a 1440×800 landscape stage puts the printer and
 * the paper across the middle two thirds of the screen, and the copy then has
 * nowhere to go but on top of them. Instead the machine is fitted into a band
 * with the copy above and below it, and the photograph is promoted out of the
 * stage to cover the viewport on its own — it is a background, and a background
 * has no reason to be tied to the machine's scale.
 */
/** Root font-size the board is measured against — the grid's own base. */
const FONT_BASE = 16;

/**
 * Narrow-desktop nudge for the machine.
 *
 * Between 1024 and 1280 the frame is far squarer than the board's 1.8, and the
 * machine — placed at the board's proportion — lands low and crowds the
 * headline beside it. Over that range it lifts to the headline's own top line
 * and steps right, clear of the text. Both are zero from 1280 up, so the
 * reference frame and the width the last pass was tuned on are untouched.
 */
/**
 * Two corrections, one for each band under the board.
 *
 * `grow` scales the machine up toward the reference size over 1280-1439, where
 * the stage rides the root font-size and reads small beside copy that is set on
 * the same grid; the lift that comes with it is cancelled so the printer's top
 * line does not move. Both taper to nothing at 1440.
 *
 * On the 1024-1279 band the machine also hangs from the headline's own top line:
 * the printer's top edge sits on it, and the receipt feeds out below.
 */
const BOARD_WIDTH = 1440;
const TIGHT_WIDTH = 1280;
const GROW = 0.085;
const HEADLINE_TOP = 126;
/**
 * How much bigger the machine runs on the 1024-1279 band. The stage rides the
 * root size while the block's width rides the window, so at 1024 the receipt
 * came out a sixth narrower than the space drawn for it. The frame there is the
 * board's full height rather than the shortened one, which is what the taller
 * paper needs — and it is the height blocks 2-4 already stand at.
 */
const NARROW_GROW = 1.096;
/** Step right on the 1024-1279 band, in board px. */
const NARROW_NUDGE_X = 20;

const NARROW = {
  /** Viewport width below which the stage is fitted rather than covering. */
  maxWidth: 1024,
  /** Slice of the stage the machine occupies: printer top to paper bottom. */
  top: PRINTER.top,
  /** Where the finished paper's torn edge lands, not where the window ends —
      the window runs to the bottom of the stage and the paper does not. */
  paperBottom: 748,
  get height() {
    return this.paperBottom - this.top;
  },
  /** Room kept for the copy above and below, as a share of the viewport. */
  bandTop: 0.217,
  bandBottom: 0.22,
  /** A phone is squarer again, and the copy under the paper had nowhere to sit. */
  phoneWidth: 640,
  phoneBandTop: 0.223,
  phoneBandBottom: 0.277,
};

/* ═══════════════════════════════════════════════════════════════════ */

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export interface OrderProps {
  background: { src: string; alt: string; width: number; height: number };
  printer: { src: string; alt: string; width: number; height: number };
  /** `fed` is scene state, not content — the block supplies it itself. */
  receipt: Omit<OrderReceiptProps, "fed">;
  copy: OrderCopyProps;
}

/**
 * The scene is a fixed 1440×800 stage scaled to COVER the viewport, so the
 * board's coordinates stay literal at every window size — the alternative,
 * re-expressing each element in percentages, drifts as soon as the aspect ratio
 * changes and there is no second board to check it against.
 *
 * Progress is read straight off `getBoundingClientRect` inside a rAF-throttled
 * passive scroll listener. No animation library is involved, and the CSS
 * variable is only written when the quantised value actually changes, so a fast
 * scroll costs one style write per feed step rather than one per frame.
 */
export const Order = ({ background, printer, receipt, copy }: OrderProps) => {
  const trackRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const queued = useRef(false);
  const progress = useRef(-1);
  const [scale, setScale] = useState(1);
  /** Vertical nudge that centres the machine on its band; 0 on the desktop board. */
  const [shift, setShift] = useState(0);
  /** Horizontal nudge on narrow desktops; 0 from 1280 up. */
  const [nudgeX, setNudgeX] = useState(0);
  const [fed, setFed] = useState(false);
  const [reduced, setReduced] = useState(false);

  const write = useCallback((p: number) => {
    if (p === progress.current) return;
    progress.current = p;
    paperRef.current?.style.setProperty("--p", String(p));
    // One state flip for the whole scroll, not one per step: React only hears
    // about the feed when the barcode crosses into view and when it leaves.
    setFed((was) => {
      const now = p >= BARCODE_FED;
      return was === now ? was : now;
    });
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // How far the block's top is past the top of the screen, in px;
    // negative while the block rises in.
    const scrolled = -track.getBoundingClientRect().top;
    const from = START_VH * window.innerHeight;
    const to = END_VH * window.innerHeight;
    let p = clamp((scrolled - from) / (to - from), 0, 1);
    p = 1 - Math.pow(1 - p, EASE_POWER);
    write(Math.round(p * STEPS) / STEPS);
  }, [write]);

  const fit = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw >= NARROW.maxWidth) {
      // The stage rides the root font-size, not the viewport, and hangs from the
      // top of the frame. Covering instead put the machine on a different scale
      // from the copy beside it — at 1280x800 the stage stayed at 1.0 while the
      // type dropped to 0.92, so the printer sat 17px below the headline's top
      // line instead of the board's 7. The photograph still covers; it is its own
      // layer and has no reason to follow the machine.
      const root =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const base = root / FONT_BASE;
      setNudgeX(0);

      if (vw >= BOARD_WIDTH) {
        setScale(base);
        setShift(0);
        return;
      }

      if (vw >= TIGHT_WIDTH) {
        const t = clamp((BOARD_WIDTH - vw) / (BOARD_WIDTH - TIGHT_WIDTH), 0, 1);
        const grown = base * (1 + GROW * t);
        setScale(grown);
        // The stage's origin is its top centre, so growing it would push the
        // machine down the frame. This puts the printer back on its own line.
        setShift(PRINTER.top * (base - grown));
        return;
      }

      const grown = base * NARROW_GROW;
      setScale(grown);
      // Keep the paper leaving the slot on the headline's own top line whatever
      // the machine is scaled to.
      setShift(HEADLINE_TOP * base - PRINTER.top * grown);
      setNudgeX(NARROW_NUDGE_X * base);
      return;
    }

    // Fit the machine into the band left between the two copy bands, and never
    // let it grow past the width either — a tall narrow window would otherwise
    // push the printer wider than the screen.
    const phone = vw < NARROW.phoneWidth;
    const bandTop = phone ? NARROW.phoneBandTop : NARROW.bandTop;
    const bandBottom = phone ? NARROW.phoneBandBottom : NARROW.bandBottom;
    const band = vh * (1 - bandTop - bandBottom);
    const next = Math.min(band / NARROW.height, (vw * 0.94) / PRINTER.width);
    setScale(next);

    // Centre the machine on the band rather than the stage on the viewport: the
    // stage's own centre sits well above the printer, so centring it would hang
    // the paper off the bottom of the screen.
    const machineTop = vh * bandTop + (band - NARROW.height * next) / 2;
    setShift(machineTop - NARROW.top * next);
    setNudgeX(0);
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => setReduced(motion.matches);
    applyMotion();
    motion.addEventListener("change", applyMotion);

    fit();
    const onResize = () => {
      fit();
      measure();
    };
    window.addEventListener("resize", onResize, { passive: true });

    if (motion.matches) {
      write(1);
      return () => {
        motion.removeEventListener("change", applyMotion);
        window.removeEventListener("resize", onResize);
      };
    }

    const onScroll = () => {
      if (queued.current) return;
      queued.current = true;
      frame.current = requestAnimationFrame(() => {
        queued.current = false;
        measure();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();

    return () => {
      cancelAnimationFrame(frame.current);
      motion.removeEventListener("change", applyMotion);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [fit, measure, write]);

  return (
    <section
      ref={trackRef}
      aria-label="Order ahead"
      className="relative w-full bg-background"
      style={{ height: reduced ? "100lvh" : `${TRACK_VH}vh` }}
      {...{ [HEADER_THEME_ATTRIBUTE]: "dark" }}
    >
      <div className="sticky top-0 h-lvh w-full overflow-hidden lg:max-xl:h-(--size-order-frame)">
        {/* The photograph covers the viewport on its own. Inside the stage it was
            tied to the machine's scale, which is exactly what has to stop below
            the desktop board — and on the board the two are identical anyway,
            because a covering stage and a covering image fill the same box. */}
        <SpringTrigger
          tag="span"
          innerTag="span"
          mode="scrub"
          /* React 19 types a null-initialised ref as nullable; the vendored
             engine's prop predates that and is not ours to change. */
          trigger={trackRef as RefObject<HTMLElement>}
          start="top bottom"
          end="top top"
          /* Translate percentages are of the box itself, which is taller than
             the frame by BG_PARALLAX — hence the division. */
          from={{
            y: reduced
              ? "0%"
              : `${(-BG_PARALLAX / (1 + BG_PARALLAX)) * 100}%`,
          }}
          to={{ y: "0%" }}
          className="absolute inset-x-0 top-0 block"
          style={{ height: `${(1 + BG_PARALLAX) * 100}%` }}
          innerClassName="block size-full"
        >
          <Image
            src={background.src}
            alt={background.alt}
            width={background.width}
            height={background.height}
            priority
            className="size-full object-cover lg:max-xl:h-[112%] lg:max-xl:object-top"
          />
        </SpringTrigger>

        {/* The board's frame. Below the 1280 board it is the stage's own height
            at the current root size rather than the window's, so the machine and
            the copy keep the reference block's spacing instead of being stretched
            across a viewport the board was never measured on — and since the
            sticky box is cut to the same height, the block ends where the copy
            does instead of trailing a strip of photograph under it. */}
        <div className="absolute inset-x-0 top-0 h-lvh lg:max-xl:h-(--size-order-frame)">
          <div
            className="absolute left-1/2 top-0"
            style={{
              width: SCENE.width,
              height: SCENE.height,
              transformOrigin: "top center",
              transform: `translateX(-50%) translate(${nudgeX}px, ${shift}px) scale(${scale})`,
            }}
          >
            <Image
              src={printer.src}
              alt={printer.alt}
              width={printer.width}
              height={printer.height}
              style={{
                position: "absolute",
                left: PRINTER.left,
                top: PRINTER.top,
                width: PRINTER.width,
                height: PRINTER.height,
                zIndex: 1,
              }}
            />

            <div
              style={{
                position: "absolute",
                left: PRINT_WINDOW.left,
                top: PRINT_WINDOW.top,
                width: PRINT_WINDOW.width,
                height: PRINT_WINDOW.height,
                overflow: "hidden",
                zIndex: 2,
              }}
            >
              <div
                ref={paperRef}
                style={{
                  // @ts-expect-error -- custom property, written by the scroll loop
                  "--p": 0,
                  width: RECEIPT.width,
                  transform: "translate3d(0, calc(-100% + var(--p) * 100%), 0)",
                  filter: `drop-shadow(0 calc(var(--p) * ${SHADOW.y}px) calc(var(--p) * ${SHADOW.blur}px) ${SHADOW.color})`,
                  willChange: "transform",
                }}
              >
                <OrderReceipt {...receipt} fed={fed} />
              </div>
            </div>
          </div>

          {/* Copy sits outside the scaled scene, on the page's rem grid, so its
            left gutter is the same forty pixels every other block stands on. */}
          <OrderCopy {...copy} />
        </div>
      </div>
    </section>
  );
};
