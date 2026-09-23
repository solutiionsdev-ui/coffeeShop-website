// 📖 Design source: Figma "Block 2" 2149:5 — the full 1440x800 board

import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";
import { SwirlFill } from "@/components/ui/swirl-fill";

import { MenuCard, type MenuItem } from "./menu-card";
import { MenuCta, type MenuCtaProps } from "./menu-cta";
import { MenuIntro, type MenuIntroProps } from "./menu-intro";

export interface MenuProps {
  intro: MenuIntroProps;
  cta: MenuCtaProps;
  items: MenuItem[];
  /** Alpha mask that paints the brand swirl behind the block. */
  swirlMask: string;
}

/**
 * Menu section — the light half of the page.
 *
 * Children render in the design's paint order: swirl, heading, the receipt and
 * its link, then the card row on top. The section declares its own surface so
 * `<SiteHeader>` flips to dark type while it is under the header.
 */
export const Menu = ({ intro, cta, items, swirlMask }: MenuProps) => {
  return (
    <section
      aria-label="Menu"
      className="relative flex flex-col w-full overflow-hidden lg:min-h-lvh bg-surface-inverse lg:h-lvh lg:max-xl:h-[calc(var(--size-board-height)+2.5rem)] lg:max-xl:min-h-0"
      {...{ [HEADER_THEME_ATTRIBUTE]: "light" }}
    >
      {/* Decorative texture, filling left to right as the block arrives. */}
      <SwirlFill
        mask={swirlMask}
        direction="ltr"
        className="left-(--size-swirl-x) top-(--size-swirl-y) h-(--size-swirl-height) w-(--size-swirl-width)"
      />

      {/* A column below the desktop board, the board's own absolute frame at and
          above it. The card row becomes a 2x2 grid on a phone: four cards across
          360 leaves each one 75px wide, which is not a product shot. */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-5 pb-14 pt-20 max-sm:gap-9 sm:gap-10 sm:px-10 sm:pb-16 sm:pt-24 sm:max-lg:grid sm:max-lg:grid-cols-2 sm:max-lg:items-end sm:max-lg:gap-x-10 sm:max-lg:gap-y-5 lg:block lg:p-0 board:top-(--size-board-drop)">
        <MenuIntro {...intro} />
        <MenuCta {...cta} />

        <ul className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 sm:gap-4 sm:max-lg:col-span-2 sm:max-lg:mt-11 lg:absolute lg:inset-x-10 lg:bottom-10 lg:top-auto lg:flex lg:gap-3 board:bottom-auto board:top-(--size-menu-cards-y)">
          {items.map((item, index) => (
            <li key={item.index} className="flex flex-1">
              <MenuCard item={item} order={index} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
