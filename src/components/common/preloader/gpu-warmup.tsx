// 📖 Docs: obsidian/frontend/components/common.md

import type { CSSProperties } from "react";

import { blobMask } from "@/components/ui/swirl-fill";

/**
 * Draws, once, every kind of drawing the page does below the fold, so the
 * browser compiles the GPU programs for them while the preloader is up instead
 * of the first time each one scrolls into view.
 *
 * Chrome draws the page with a GPU pipeline per combination of shape, fill,
 * blend, clip and render target, and compiles each the first time it is needed
 * — synchronously, on the GPU thread, at 200-400 ms apiece on a cold cache.
 * Nothing above the fold needs these, so on a first visit each one compiled
 * mid-scroll and each compile was a freeze. The list is measured, not guessed:
 * Chrome's trace names every pipeline it creates, and each sample here stands
 * in for one that was created during the first scroll.
 *
 * A pipeline is keyed by *what* is drawn, not where or in what colour — so the
 * samples draw in the background colour on the background colour and nothing
 * shows. What does matter, and each was learnt the hard way:
 *
 * - **Use the real thing.** The key depends on how Blink turns CSS into draws
 *   (a radial gradient with a stop past 100% becomes a two-point conical, a
 *   different program), so the swirl samples are the swirl's own mask and the
 *   scrim sample is the scrim's own token.
 * - **Keep the passes apart.** Anything that needs multisampling (an even-odd
 *   path, the preloader's own cup) turns the whole tile's pass multisampled,
 *   and every program in it becomes a different one. The raster samples and
 *   the multisampled ones each get their own layer.
 * - **Compositor samples must span tiles.** The compositor draws a layer that
 *   covers several tiles with a clamped texture — a different program from a
 *   one-tile speck — so those three are full-panel layers.
 * - **Never a flat colour, never opacity 0.** A uniform fill is folded into a
 *   solid quad and a transparent layer is skipped; either compiles nothing.
 *
 * Sits under the panel's type (`-z-10`) and leaves with the panel. The panel is
 * in the server HTML, so this paints on the first frame — reduced-motion
 * visitors included, whose panel is only dropped at hydration.
 *
 * Changing how a section draws — a new gradient shape, a new blend, a clipped
 * or turned layer — can need a pipeline this list does not cover. Re-run the
 * trace (obsidian/workflows/optimize-3d-scene.md) rather than guessing.
 */

/** The swirl's blob mask part-way — every blob inside its box: radials. */
const SWIRL_EARLY = {
  maskImage: blobMask("ltr"),
  "--fill": 50,
} as CSSProperties;

/** Near the end — the blobs' stops run past 100%: two-point conicals. */
const SWIRL_LATE = {
  maskImage: blobMask("ltr"),
  "--fill": 95,
} as CSSProperties;

const SPECK = "block size-2 shrink-0 bg-background";

/** A layer of the philosophy scrim's gradient: textured, so never a solid quad. */
const TEXTURED = "bg-[image:var(--philosophy-scrim)]";

export const GpuWarmup = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
  >
    {/* Compositor. Each comes twice — panel-sized, whose tiles it fills
        exactly, and a third of it, whose last row of tiles it only part-fills,
        which is another program. An opaque layer, drawn without blending … */}
    <span
      className={`absolute inset-0 bg-background ${TEXTURED} will-change-transform`}
    />
    <span
      className={`absolute inset-x-0 top-0 h-1/3 bg-background ${TEXTURED} will-change-transform`}
    />
    {/* … a translucent one on whole pixels — the reveals fading in … */}
    <span
      className={`absolute inset-0 ${TEXTURED} opacity-50 will-change-[opacity]`}
    />
    <span
      className={`absolute inset-x-0 bottom-0 h-1/3 ${TEXTURED} opacity-50 will-change-[opacity]`}
    />
    {/* … a translucent one scaled — the hero still arriving … */}
    <span
      className={`absolute inset-0 scale-95 ${TEXTURED} opacity-50 will-change-transform`}
    />
    <span
      className={`absolute inset-x-0 top-0 h-1/3 scale-95 ${TEXTURED} opacity-50 will-change-transform`}
    />
    {/* … and a translucent one turned under a rounded clip — the locations
        cup's lean and turn. */}
    <span className="absolute inset-0 overflow-hidden rounded-full">
      <span
        className={`block size-full rotate-1 ${TEXTURED} opacity-50 will-change-transform`}
      />
    </span>

    {/* Display type, plain, clipped, scaled and both — the hero's headline and
        script and the header arriving. Type this large is drawn from distance
        fields rather than bitmaps, a program of its own. */}
    <span className="absolute bottom-0 left-0 flex font-display text-display leading-display text-background will-change-transform">
      <span className="inline-block">g</span>
      <span className="inline-block overflow-hidden rounded-full">g</span>
      <span className="inline-block scale-95">g</span>
      <span className="inline-block scale-95 overflow-hidden rounded-full">
        g
      </span>
    </span>

    {/* Raster, single-sampled: its own layer so nothing multisampled shares
        its tiles. Each fill comes square (filled plainly) and scaled (with an
        antialiased edge), which are two programs. */}
    <span className="absolute left-0 top-0 flex gap-1 p-1 will-change-transform">
      {/* Swirl fill (menu, locations), both phases. */}
      <span className={SPECK} style={SWIRL_EARLY} />
      <span className={`${SPECK} scale-95`} style={SWIRL_EARLY} />
      <span className={SPECK} style={SWIRL_LATE} />
      <span className={`${SPECK} scale-95`} style={SWIRL_LATE} />
      {/* Philosophy scrim: five stops. */}
      <span className={`block size-2 shrink-0 ${TEXTURED}`} />
      {/* A solid fill with an antialiased edge under a rounded clip. */}
      <span className="block size-2 shrink-0 overflow-hidden rounded-full">
        <span className="block size-full scale-95 bg-background" />
      </span>
    </span>

    {/* Raster, multisampled: an even-odd path and clipped type (philosophy
        copy), in a layer of their own. */}
    <span className="absolute right-0 top-0 flex gap-1 p-1 will-change-transform">
      <svg viewBox="0 0 8 8" className="block size-2" aria-hidden="true">
        <path
          d="M0 4a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M2 4a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
          fillRule="evenodd"
          className="fill-background"
        />
      </svg>
      <span className="block size-2 overflow-hidden rounded-full font-mono text-fine leading-flush text-background">
        g
      </span>
    </span>
  </span>
);
