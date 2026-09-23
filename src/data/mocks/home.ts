/**
 * Placeholder content for the home page.
 *
 * Copy is transcribed character-for-character from the Figma board
 * "Concept 7" (1276:566) — casing that appears uppercase on screen comes from
 * the design's `uppercase` styling, not from the source strings.
 */
import type { HeroProps } from "@/components/hero";
import type { LocationsProps } from "@/components/locations";
import type { MenuProps } from "@/components/menu";
import type { OrderProps } from "@/components/order";
import type { PhilosophyProps } from "@/components/philosophy";

export const heroContent: HeroProps = {
  copy: {
    eyebrow: { slash: "//", label: "Specialty Coffee House" },
    headline: "COFFEE FOR YOUR",
    script: "moment",
    lede: "CAREFULLY SOURCED BEANS AND THOUGHTFULLY BREWED TO BRING OUT THE BEST IN EVERY CUP.",
    cta: { label: "explore menu", href: "#menu" },
  },
  media: {
    src: "/assets/hero/models.glb",
    alt: "A brewns coffee house bag of slow roast beans beside a branded takeaway cup",
    // One card per piece, shown for whichever the pointer is on.
    cards: {
      bag: {
        eyebrow: { slash: "//", label: "in the bag" },
        name: "SLOW ROAST",
        price: "$18.00",
        meta: ["250 G", "WHOLE BEAN", "COPENHAGEN"],
      },
      cup: {
        eyebrow: { slash: "//", label: "in the cup" },
        name: "HOUSE LATTE",
        price: "$4.20",
        meta: ["250 ML", "BREWED DAILY", "TO GO"],
      },
    },
  },
  info: {
    hours: ["OPEN DAILY", "07:00 - 21:00"],
    address: ["139 COFFEE STREET", "SAN FRANCISCO, CA"],
    social: [
      { label: "INSTAGRAM", href: "https://instagram.com" },
      { label: "TIKTOK", href: "https://tiktok.com" },
    ],
  },
};

/**
 * Menu block — Figma "Block 2" (2149:5), hover board 2229:145.
 *
 * `frame` and `crop` describe where each still sits inside its card and how it
 * is cropped there; both are properties of the photograph, so they travel with
 * the content rather than living in the token system.
 */
export const menuContent: MenuProps = {
  swirlMask: "/assets/shared/swirl-mask.webp",
  intro: {
    eyebrow: { slash: "//", label: "our menu" },
    heading: "FAVORITES MADE DAILY",
    lede: "Quality ingredients, carefully prepared. Simple, balanced and made to enjoy.",
  },
  cta: {
    cta: { label: "view full menu", href: "#menu" },
    receipt: {
      src: "/assets/menu/menu-receipt.webp",
      width: 832,
      height: 1890,
    },
  },
  items: [
    {
      index: "01",
      name: "ESPRESSO",
      price: "$2.50",
      media: {
        src: "/assets/menu/menu-espresso.webp",
        alt: "A brewns single-shot espresso cup",
        width: 1216,
        height: 1293,
        frame: { width: 129, height: 156, bottom: 0, offsetX: 0 },
        crop: {
          top: "-12.54%",
          left: "-27.55%",
          width: "145.17%",
          height: "128.38%",
        },
        fit: "fill",
        clip: true,
      },
    },
    {
      index: "02",
      name: "LATTE",
      price: "$4.20",
      media: {
        src: "/assets/menu/menu-latte.webp",
        alt: "A brewns latte cup with a heart poured into the foam",
        width: 1024,
        height: 1536,
        frame: { width: 180, height: 205, bottom: 0, offsetX: 0.5 },
        crop: {
          top: "-16.55%",
          left: "-0.03%",
          width: "100.07%",
          height: "132.36%",
        },
        fit: "fill",
        clip: true,
      },
    },
    {
      index: "03",
      name: "ICED COFFEE",
      price: "$4.50",
      media: {
        src: "/assets/menu/menu-iced-coffee.webp",
        alt: "A brewns iced matcha in a clear cup with a straw",
        width: 1024,
        height: 1536,
        frame: { width: 197, height: 261, bottom: 0, offsetX: 0 },
        crop: {
          top: "0.1%",
          left: "2.54%",
          width: "94.92%",
          height: "107.62%",
        },
        fit: "fill",
        clip: false,
      },
    },
    {
      index: "04",
      name: "CINNAMON ROLL",
      price: "$3.80",
      media: {
        src: "/assets/menu/menu-cinnamon.webp",
        alt: "A glazed cinnamon roll on a ceramic plate",
        width: 1536,
        height: 1024,
        frame: { width: 327, height: 218, bottom: -8, offsetX: 0 },
        crop: { top: "0%", left: "0%", width: "100%", height: "100%" },
        fit: "cover",
        clip: true,
      },
    },
  ],
};

/**
 * Locations block — Figma "Block 3_v2" (2164:283).
 *
 * Addresses arrive pre-split into their rendered lines so the column breaks
 * exactly where the board does, rather than wherever the measured width lands.
 */
export const locationsContent: LocationsProps = {
  swirlMask: "/assets/shared/swirl-mask.webp",
  info: {
    eyebrow: "OUR LOCATIONS",
    addresses: [
      ["139 Coffee Street", "San Francisco, CA"],
      ["310 Valencia Street", "San Francisco, CA"],
      ["56 Columbus Avenue", "San Francisco, CA"],
    ],
    hours: ["OPEN DAILY", "07:00 - 21:00"],
  },
  dial: {
    dial: {
      src: "/assets/locations/clock.webp",
      alt: "A clock face marking the hours",
      width: 1308,
      height: 1308,
    },
    cup: {
      src: "/assets/locations/cup.webp",
      alt: "A brewns iced latte in a clear cup",
      width: 1024,
      height: 1536,
    },
  },
};

/**
 * Philosophy block — Figma "Block 4" (2173:591).
 *
 * The headline is Geist SemiBold, which is why the family is loaded from Google
 * Fonts in `app/layout.tsx` rather than from `src/fonts` — the local file is a
 * static Bold with no weight axis.
 */
export const philosophyContent: PhilosophyProps = {
  cup: {
    // The hero's file: its second scene is the cup alone, its third a bean.
    src: "/assets/hero/models.glb",
    alt: "A branded brewns takeaway cup, tipped to one side among drifting coffee beans",
  },
  copy: {
    headline: "THE CITY NEVER STOPS. YOUR COFFEE SHOULDN'T SLOW YOU DOWN.",
    lede: "Stay for a conversation or leave with the cup in your hand — both work, neither takes any effort. Nothing here is rushed, and nothing keeps you longer than you meant to stay.",
    claims: ["Good coffee.", "NO CEREMONY.", "NO WAITING."],
    eyebrow: { slash: "//", label: "OUR Philosophy" },
  },
};

/**
 * Order block — the printer scene. Board coordinates and the receipt's own
 * design values live in `components/order/`, not here; this is only its content.
 */
export const orderContent: OrderProps = {
  background: {
    src: "/assets/order/bg-table.webp",
    alt: "Two matcha cakes on brewns plates on a steel side table",
    width: 1440,
    height: 800,
  },
  printer: {
    src: "/assets/order/printer.webp",
    alt: "",
    width: 404,
    height: 72,
  },
  receipt: {
    brand: "BREWNS COFFEE HOUSE",
    cup: {
      src: "/assets/order/matcha-cup.webp",
      alt: "A brewns iced matcha latte",
      width: 155,
      height: 252,
    },
    tagline: ["GOOD COFFEE.", "MADE FOR YOUR DAY."],
    order: { id: "ORDER #00025", date: "21/05/2025", time: "12:45" },
    thanks: ["THANK YOU FOR CHOOSING BREWNS.", "SEE YOU SOON!"],
    promo: {
      headline: ["SKIP THE LINE.", "ORDER AHEAD."],
      blurb: ["SAVE TIME.", "GET YOUR COFFEE FASTER."],
      cta: "ORDER NOW",
    },
    domain: "BREWNS.COFFEE",
  },
  copy: {
    headline: "COFFEE FOR RIGHT NOW.",
    note: "WE HANDLE THE CRAFT. YOU HANDLE THE DAY.",
    aside:
      "WE WORK TO ONE SCHEDULE: YOURS. ORDER AHEAD AND YOUR CUP IS POURED TO MEET YOU, NOT TO SIT WAITING. FAST BECAUSE IT\u2019S TIMED TO YOU, NOT BECAUSE IT\u2019S RUSHED.",
    cta: { label: "order right now", href: "#order" },
  },
};
