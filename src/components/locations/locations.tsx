// 📖 Design source: Figma "Block 3_v2" 2164:283 — the full 1440x800 board

import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";
import { SwirlFill } from "@/components/ui/swirl-fill";

import { LocationsDial, type LocationsDialProps } from "./locations-dial";
import { LocationsInfo, type LocationsInfoProps } from "./locations-info";

export interface LocationsProps {
  info: LocationsInfoProps;
  dial: LocationsDialProps;
  /** Alpha mask that paints the brand swirl behind the block. */
  swirlMask: string;
}

/**
 * Locations section — the clock face, with the shop's addresses around it.
 *
 * Shares the menu block's light surface, so it declares the same header theme.
 */
export const Locations = ({ info, dial, swirlMask }: LocationsProps) => {
  return (
    <section
      aria-label="Our locations"
      className="relative flex flex-col w-full overflow-hidden lg:min-h-lvh bg-surface-inverse lg:h-lvh lg:max-xl:h-(--size-board-height) lg:max-xl:min-h-0"
      {...{ [HEADER_THEME_ATTRIBUTE]: "light" }}
    >
      {/* Decorative texture, filling right to left — the menu block above
          fills left to right, so the two read as one stroke carried on. */}
      <SwirlFill
        mask={swirlMask}
        direction="rtl"
        fadeTop
        className="left-(--size-swirl-x) top-(--size-swirl-y) h-(--size-swirl-height) w-(--size-swirl-width)"
      />

      {/* The dial is the block on a phone: it leads, the addresses follow it in
          the flow instead of being ranged down its left edge. */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-5 pb-14 pt-20 sm:gap-10 sm:px-10 sm:pb-16 sm:pt-24 sm:max-lg:pb-10 max-lg:grid max-lg:grid-cols-2 max-lg:items-start max-sm:gap-y-10 lg:block lg:p-0 board:top-(--size-board-drop)">
        <LocationsDial {...dial} />
        <LocationsInfo {...info} />
      </div>
    </section>
  );
};
