import saved from "@/data/hero-layout.json";

/**
 * One transform for the hero's whole product — bag and cup together — laid
 * over the automatic fit. Saved to `src/data/hero-layout.json` from the
 * dev-only model panel.
 *
 * Deliberately free of zod: this module ships to the browser with the hero,
 * and the only place that has to distrust the shape is the dev route that
 * writes it, which carries its own schema.
 */
export interface HeroLayout {
  /** Offset from the fitted placement, in product heights. */
  position: [number, number, number];
  /** Euler XYZ about the product's centre, degrees. */
  rotation: [number, number, number];
  /** Uniform scale about the product's centre. */
  scale: number;
}

/** The fitted placement, untouched. */
export const DEFAULT_HERO_LAYOUT: HeroLayout = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
};

/** What the panel starts from, handed over once the model has loaded. */
export interface HeroSnapshot {
  layout: HeroLayout;
  /** What "reset" goes back to. */
  file: HeroLayout;
}

/** The model's side of the panel. */
export interface HeroModelControls {
  apply: (layout: HeroLayout) => void;
}

export const savedHeroLayout: HeroLayout = {
  ...DEFAULT_HERO_LAYOUT,
  ...(saved as Partial<HeroLayout>),
};

/** The panel is a tuning tool: development only, never in a production build,
    and even there hidden until the address carries `?panel`. */
export const HERO_PANEL = process.env.NODE_ENV === "development";

/** Where the dev route saves to, relative to the project root. */
export const HERO_LAYOUT_FILE = "src/data/hero-layout.json";
