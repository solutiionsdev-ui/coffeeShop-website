// 📖 Design source: Figma "Block 4" 2173:591 — the full 1440x800 board

import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";
import { OpalesceGradient } from "@/components/ui/opalesce-gradient";

import { CUP_ANCHOR } from "./cup-anchor";
import { PhilosophyCopy, type PhilosophyCopyProps } from "./philosophy-copy";
import { PhilosophyScene } from "./philosophy-scene";

export interface PhilosophyProps {
  copy: PhilosophyCopyProps;
  /** The 3D layer: the cup and the beans around it, read from one .glb. */
  cup: { src: string; alt: string };
}

/**
 * Philosophy section — the same Opalesce field as the hero, with coffee beans
 * floating across it and the hero's cup standing in it.
 *
 * The block used to be a flat surface with the brand swirl on it. It now runs
 * the shader instead, which is why the swirl is gone rather than layered on
 * top: the two textures were competing, and the gradient is the stronger one.
 * The scrim is this block's own, running top-to-bottom, because the copy sits
 * in the top and bottom bands and the cup wants the middle left alone.
 *
 * The beans and the cup are one WebGL layer (`philosophy-scene.tsx`) over the
 * scrim and under the copy. The layout still places the cup: the figure below
 * is the board's cup box, empty, and the scene draws the cup over it.
 */
export const Philosophy = ({ copy, cup }: PhilosophyProps) => {
  return (
    <section
      aria-label="Our philosophy"
      className="relative flex flex-col w-full overflow-hidden lg:min-h-lvh bg-background lg:h-lvh lg:max-xl:h-(--size-board-height) lg:max-xl:min-h-0"
      {...{ [HEADER_THEME_ATTRIBUTE]: "dark" }}
    >
      <OpalesceGradient />

      {/* Keeps the caramel highlights from drifting under the copy bands. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-1 bg-[image:var(--philosophy-scrim)]"
      />

      <PhilosophyScene src={cup.src} />

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-5 pb-14 pt-20 max-sm:gap-5 sm:gap-10 sm:px-10 sm:pb-16 sm:pt-24 sm:max-lg:grid sm:max-lg:grid-cols-[21rem_1fr] sm:max-lg:content-center sm:max-lg:items-end sm:max-lg:gap-x-5 lg:absolute lg:inset-0 lg:block lg:p-0 board:bottom-0 board:top-(--size-board-drop)">
        {/* The cup's box. Nothing is painted in it — the scene draws the cup
            over it — but it is what the layout places, and it carries the
            cup's name for anyone who cannot see the canvas. */}
        <figure
          {...{ [CUP_ANCHOR]: "" }}
          className="pointer-events-none order-2 mx-auto aspect-2/3 h-auto w-52 max-sm:mt-5 max-sm:-mb-3 max-sm:w-64 sm:w-64 sm:max-lg:col-span-2 sm:max-lg:w-88 lg:absolute lg:left-(--size-philosophy-cup-x) lg:top-(--size-philosophy-cup-y) lg:order-none xl:max-board:bottom-[0.3125rem] xl:max-board:top-auto xl:max-board:h-[calc(var(--size-philosophy-cup-height)*1.09)] xl:max-board:w-[calc(var(--size-philosophy-cup-width)*1.09)] lg:h-(--size-philosophy-cup-height) lg:w-(--size-philosophy-cup-width)"
        >
          <span role="img" aria-label={cup.alt} className="block size-full" />
        </figure>

        <PhilosophyCopy {...copy} />
      </div>
    </section>
  );
};
