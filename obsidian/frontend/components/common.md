---
tags: [frontend, stable]
updated: 2026-09-12
---

# Catalog — Common Components

Files in `src/components/common/` — shared infrastructure that may depend on
providers. Conventions: [[component-conventions]].

## Cookie — `Cookie/`

Self-contained cookie consent system — a bottom-right **banner** plus a full
category **preferences modal**. No third-party library (the old
`react-cookie-consent` dependency was removed). Lives in `src/components/common/Cookie/`.

| File | Role |
|------|------|
| `Cookie.tsx` | Mount component — hydrates the store, renders banner + modal |
| `LazyCookie.tsx` | `next/dynamic` `ssr:false` wrapper — keeps cookie JS out of first-load |
| `CookieBanner.tsx` | Bottom-right consent banner |
| `CookiePreferencesModal.tsx` | Category preferences dialog with per-category toggles |
| `CookieButton.tsx` | Local button primitive — `primary` / `secondary` variants |
| `cookieStore.ts` | Zustand store + `localStorage` persistence |
| `index.ts` | Barrel exports — `Cookie`, `LazyCookie`, `useCookieStore`, `CookieConsent` |

**Mounting** — the root layout renders `<LazyCookie />` inside `ScrollLayout`:
```tsx
import { LazyCookie } from "@/components/common/Cookie";
```

**State** — `useCookieStore` (Zustand). `consent` is `null` until the user decides;
the banner shows only after hydration confirms `consent === null`. Persisted to
`localStorage` under key `cookie-consent-v1`. Three categories: `necessary`
(always on), `analytics`, `marketing`.

**Styling & motion** — ported to the project stack: Tailwind v4 with the
`background` / `foreground` design tokens (dark-mode adaptive, no hardcoded hex),
and `@react-spring/web` for all motion — `useTransition` drives the banner and
modal mount/unmount, `useSpring` drives the toggle knob. No CSS transitions.
The modal locks scroll through the Lenis [[smooth-scroll|scroll store]]
(`useScroll.stop()`), not `body` overflow.

> [!note] `#todo`
> The privacy-policy link points to `/privacy-policy` — that route does not exist
> yet. Placeholder consent copy should be reviewed before launch.

## Grid — adaptive scaling (`grid/`)

The **adaptive scaling grid** keeps a rem-based layout proportional across every
viewport by scaling the root (`<html>`) font-size. Design in `rem` once, and the
whole UI scales as one unit. Lives in `src/components/common/grid/`.

| File | Role |
|------|------|
| `grid.config.ts` | Breakpoints + `FONT_BASE` — the single source of truth for the grid |
| `adaptive-grid.tsx` | `<AdaptiveGrid>` client component — drives the scale-up, renders `null` |
| `index.ts` | Barrel exports — `AdaptiveGrid`, `GRID_BREAKPOINTS`, … |

**How it works** — two halves cover the whole viewport range:

- **Scale down** (viewport ≤ 1920px) — `vw`-based `html { font-size }` media
  queries in `globals.css`. At each breakpoint's design base width the root
  font-size resolves to 16px; between breakpoints it tracks the viewport.
- **Scale up** (viewport > 1920px) — the `<AdaptiveGrid>` component sets an
  inline `html` font-size at runtime via [[hooks|`useAdaptiveGrid`]], so the
  design keeps growing (damped by `coef`) on large displays.

The `globals.css` media queries and `grid.config.ts` describe the same
breakpoints — **keep them in sync** (formula: `font-size = 16 * 100 / baseWidth vw`).

**Mounting** — the root layout renders `<AdaptiveGrid />` inside `ScrollLayout`:
```tsx
import { AdaptiveGrid } from "@/components/common/grid";
```
Mount it once. Props: `baseWidth` (defaults to the largest breakpoint) and
`coef` (0–1 scale-up damping, default `0.6666`).

> [!note]
> This replaced a `styled-components`-based scaling system that was dropped into
> `common/` — see [[decisions-log]] ADR-0008. `styled-components` is **not** a
> project dependency; the scale-down CSS lives in `globals.css` per [[design-system]].

## ReducedMotion — `reduced-motion.tsx`

`<ReducedMotion>` — a client leaf that calls react-spring's `useReducedMotion()`.
It watches the `prefers-reduced-motion` media query and toggles react-spring's
global `skipAnimation`, so every spring — and `spring-text-engine` — jumps to its
end state instead of animating. Renders `null`; mounted once in the root layout.
See [[animation-system]] and [[seo-metadata]].

## Preloader — `preloader/`

| File | Role |
|------|------|
| `site-preloader.tsx` | `SitePreloader` — the full-screen cup that fills with the load, then pours away |
| `gpu-warmup.tsx` | `GpuWarmup` — invisible samples that compile the page's GPU programs under the panel |
| `index.ts` | Barrel — `SitePreloader`, `SitePreloaderProps` |

**`SitePreloader`** is mounted once in `app/layout.tsx`. The level rises on real
signals (mount → `document.fonts.ready` → `load`, `MAX_WAIT` 4 s backstop), and
when the cup is full the panel pours away. It drives `usePageReady`: `revealing`
the moment the pour starts, `ready` when it ends. Under reduced motion it renders
nothing after hydration (the server HTML still paints it once).

**`GpuWarmup`** exists because of how Chrome draws. Every combination of shape,
fill, blend, clip and render target is its own GPU pipeline, compiled
synchronously on the GPU thread the first time it is needed — 200–400 ms each
on a cold cache (a first visit, or after a browser update). Nothing above the
fold uses the combinations the lower sections need, so each one used to compile
*mid-scroll*, and each compile was a visible freeze. `GpuWarmup` draws one sample
of each while the panel covers the page, so they compile then instead.

- The samples are **measured, not guessed**: Chrome's trace names every
  pipeline it creates (`createGraphicsPipeline`, category
  `disabled-by-default-skia.shaders`). Each sample stands in for one that was
  created during the first scroll. How to re-run it: [[optimize-3d-scene]].
- They draw the **background colour on the background colour**, under the
  panel's type (`-z-10`) — a pipeline is keyed by what is drawn, not its colour.
- **Use the real thing.** The swirl samples are the swirl's own `blobMask()`
  (exported from `ui/swirl-fill.tsx`) and the scrim sample is `--philosophy-scrim`
  — a hand-made "equivalent" compiled a different program every time.
- **Keep single- and multisampled raster apart**, each sample group in its own
  layer: one even-odd path in a tile turns the whole tile's pass multisampled.
- Compositor samples are **panel-sized and a third of it**: a layer that fills
  its tiles exactly and one that part-fills its last row use different programs.
- Never a flat colour, never `opacity-0`: both are optimised away, compiling
  nothing.

> [!warning] Changing how a section draws can need a new sample
> A new gradient shape, blend, clip or transformed layer below the fold may use a
> pipeline this list does not cover — and the freeze comes back on first visits
> only, so it is easy to miss on a warm dev machine. Re-run the cold trace after
> visual changes. ADR: [[decisions-log]] ADR-0023.

## Skeleton loaders

Three skeleton components for `loading` states of async-data components — every
async component must mirror its final layout with one of these
(see [[component-conventions]]).

| Component | File | For |
|-----------|------|-----|
| `<SkeletonImage>` | `skeleton-image.tsx` | image placeholders |
| `<SkeletonLoader>` | `skeleton-loader.tsx` | generic block placeholders |
| `<SkeletonVideo>` | `skeleton-video.tsx` | video placeholders |

> [!note]
> `components/ui/` (design-system primitives) does not exist yet — create it when
> the first primitive is added. See [[folder-structure]].

## Related

[[component-conventions]] · [[components/animation-springs]]

## Hero — `src/components/hero/`

The `Concept 7` hero section, ported from Figma `1276:566`. Feature-scoped, not a
reusable primitive — it lives in its own folder rather than in `ui/` because
nothing outside the home page consumes it. Node IDs and assets: `DESIGN-MAP.md`.

| File | Role |
|------|------|
| `hero.tsx` | `Hero` — Server Component; `h-lvh` frame that composes the four leaves |
| `hero-gradient.tsx` | The Opalesce WebGL2 gradient — see below |
| `hero-media.tsx` | Product still (`next/image`, `priority`) |
| `hero-nav.tsx` | Top bar — links, centred wordmark, ORDER ONLINE |
| `hero-copy.tsx` | Eyebrow, `h1`, script accent, lede, EXPLORE MENU |
| `hero-info-bar.tsx` | Bottom strip — hours, address, socials |
| `hero-glyphs.tsx` | `ArrowGlyph` — the exported arrow path, recoloured via `currentColor` |
| `hero-pulse-dot.tsx` | `HeroPulseDot` — the looping ORDER ONLINE status dot |
| `index.ts` | Barrel — `Hero`, `HeroProps` |

**Content** comes in as props from `src/data/mocks/home.ts`; nothing is hardcoded
in the components.

**The 3D product** (`hero-model.tsx`) renders the default scene of
`public/assets/hero/models.glb` — bag and cup, placed as the .glb composes them.
The whole product carries **one** transform from `src/data/hero-layout.json`
(position in product heights, rotation°, uniform scale), applied on a `stage`
group *above* the fit — the fit projects through the pivot's own matrix, so the
offset is laid over the fitted placement rather than re-fitted away. In
`next dev` a **model panel** (`hero-model-panel.tsx`, gated by `HERO_PANEL` in
`src/lib/hero-layout.ts`) edits it live, and **Save** writes the JSON through
the dev-only `app/api/dev/hero-layout` route (404 in production).

**Per-piece motion.** Each piece hangs from a holder at its own centre. Only
the piece under the pointer (a raycast through the canvas) lifts, with a small
twist (`LIFT.turn` / `roll`). The cursor lean is per piece too (`LEAN`: the cup
turns further and sooner than the bag), so the two lean out of step; the pivot
itself only answers the drag. Normal maps are forced to `NORMAL_STRENGTH` 1: the
export's bag carries 3.3, which shades its folds black.

**Canvas bleed and scroll drift.** The canvas overhangs the frame by `BLEED`
on every side so the panel's offset/scale can carry the product past the
frame without being cut; the fit still solves against the frame. A `drift`
group above the stage sinks the product by `SCROLL_DROP` product heights as
the hero scrolls away. An `intro` group plays the entrance the moment the
preloader starts to pour away (`usePageReady.revealing`, set before `ready`):
straight up from below, turning a little into the pose. Scene graph: `scene → drift → stage → intro → pivot → model → piece
holders` — `intro` must stay *under* the stage: above it, its turn pivots on
the scene origin and the stage's offset swings the product sideways.
The model panel is dev-only and opt-in with `?panel` in the address.

**Card per piece.** `HeroModel` calls `onPiece` with the hovered piece;
`HeroMedia` keeps the last one and renders `cards[piece]` from `home.ts`.

**Composition** — everything is absolutely positioned from the edge it is
anchored to in the design (nav from the top, copy from the vertical centre less
28px, info bar from the bottom gutter), so the frame stays correct at any
viewport height. The two masks are alpha masks painted with tokens, not images.

### The Opalesce gradient

`hero-gradient.tsx` renders the shader specified in **`docs/opalesce.md`**, which
is kept in the repo permanently: CONFIG is a list of bare numbers without it.

- **The GLSL and the engine are verbatim.** Recolouring means editing CONFIG,
  never the shader — the ramp is walked perceptually and the stops are placed
  against each other. The spec's non-negotiables are the three-node pointer rig,
  the accumulating clock and the `[4.167, 50]` ms frame clamp.
- **Only the size binding differs** from the spec's full-screen engine, and the
  spec asks for it: `clientWidth/clientHeight`, a `ResizeObserver`, and
  `getBoundingClientRect()` in `aim()`.
- **Layers:** canvas `z-0`, readability scrim `z-1`, content `z-10`. The section
  and `body` must both stay `#070707` — the shader's `bgColor` — or the canvas
  edge shows a seam.
- **The pointer is on.** Five CONFIG values differ from the spec: `speed` 0.12,
  `cursor` 1, `pointerRadius` 0.3, `pointerStrength` 1.2, `iridescence` 0.22,
  `parallax` 0.01.
  `pointerRadius` is the one that decides whether it reads as interaction at all
  — `uv` is scaled by height, so the spec's 0.75 is a gaussian wider than the
  frame and washes everything evenly instead of following the hand.
  Smoothness is the three-node rig: the body node reaches 90% of a step input in
  ~1.07 s, identically at 60, 120 and 144 Hz. Never replace it with a single lerp
  — a lone follower can only decelerate *into* its target, so direction changes
  hinge on a corner.
- **Verify pointer changes with `iTime` frozen.** The field drifts on its own;
  two live screenshots always differ, whatever the pointer is doing.
- **The scrim is a token,** `--hero-scrim`. Tune the stops and alphas there.
  Its job is measured: worst-case headline contrast is **7.39:1** at 1440×800
  with the pointer swept over an 11×8 grid of resting positions — the tightest
  viewport, and the pointer is what makes it tight (parked at the origin it is
  9.5:1). Use a fine grid: a coarse 5×3 one misses the worst position by 0.18.
  Re-measure if the scrim, the copy column width, `pointerStrength` or
  `iridescence` changes.
- **Degrades quietly:** no WebGL2 → the `--hero-gradient-fallback` CSS ramp stays
  visible and nothing throws. `prefers-reduced-motion` → one `drawArrays`, no
  rAF. Off-screen and hidden tabs stop drawing; context loss rebuilds.

> [!warning] Desktop only
> Only the 1440 frame was designed. Below 1024 the desktop composition renders
> as-is — a tablet and mobile frame are needed before this responds properly.

## Site header — `src/components/common/header/`

The page's one top bar. Both Figma boards draw the same row from the same
wordmark mask, so it is not part of any section — it is fixed, mounted once in
`app/layout.tsx`, and recolours itself as sections pass beneath it.

| File | Role |
|------|------|
| `site-header.tsx` | `SiteHeader` — the fixed row; probes the section under it on the shared ticker |
| `header-theme.ts` | `HEADER_THEME_ATTRIBUTE` + `HeaderTheme` — the section contract |
| `pulse-dot.tsx` | `PulseDot` — the amber ORDER ONLINE dot, pulsing on a loop |
| `index.ts` | Barrel |

**A section opts in** by declaring the surface it presents to the header:

```tsx
<section {...{ [HEADER_THEME_ATTRIBUTE]: "light" }}>
```

> [!warning] Keep the constant out of the `"use client"` file
> `header-theme.ts` has no directive on purpose. Exports of a client module
> imported into a Server Component arrive as client references rather than
> values, so a constant declared in `site-header.tsx` produced no attribute at
> all — the header simply never changed colour.

The theme is read on `useLoop` (the shared rAF ticker) rather than with an
IntersectionObserver: the observer would need a zero-height root band at the
header's centre line, which `rootMargin` cannot express without knowing the
viewport height in advance.

## Site footer — `src/components/common/footer/`

Figma "Concept 6" (`2173:655`). A 385px band, not a viewport section, mounted in
`app/layout.tsx` next to `<SiteHeader>` because it is site chrome. Content lives
in `data/mocks/footer.ts`. Its swirl uses `--surface-backdrop-soft`, the shared
mask at half strength.

## Order section — `src/components/order/`

Figma "Block 5" (`2190:1130`) — a thermal printer feeding a receipt as you
scroll. The receipt is HTML, not an image, so the type stays sharp and the order
number is a prop.

**Feed range — no pin.** The block is one screen (`TRACK_VH` 100) and never
pins. The feed runs while it rises in, from `START_VH` (−0.85) to `END_VH` (0)
viewport heights of scroll relative to the block's top reaching the screen's
top, so the receipt is fully out exactly as the block fills the screen and the
page scrolls straight on into the footer. The sticky wrapper is kept but is
inert at 100vh; any `TRACK_VH` over 100 pins the stage with nothing left to
feed, which is what read as the pause before the footer.

**Background parallax.** The photograph sits in a `<SpringTrigger mode="scrub">`
box `1 + BG_PARALLAX` of the frame tall, scrubbed over `top bottom` → `top top`
of the track: it starts lifted by `BG_PARALLAX` of the frame and lands flush with
the frame's top as the stage pins, then holds for the whole receipt feed. The
translate is a percentage of the taller box, hence `-P / (1 + P)`. Under reduced
motion `from` equals `to`, so it never moves. A bigger `BG_PARALLAX` crops more
off the photo's sides (the box is taller, `object-cover` scales it up).

> [!important] The paper hangs in front of the printer, not behind it
> The bar sits at z-index 1, under the print window. Drawing it over the paper
> hides everything between the slot and the bar's lower lip — the sheet then
> only appears below the bar, which is not how a printer looks.

> [!important] Use `drop-shadow`, not `box-shadow`, on a torn edge
> `box-shadow` follows the border box, so it lays a straight bar of shadow
> across the receipt's teeth. `filter: drop-shadow()` traces the alpha silhouette.

## Menu section — `src/components/menu/`

Figma "Block 2" (`2149:5`) with its hover board (`2229:145`). Feature-scoped, in
its own folder alongside `hero/`.

| File | Role |
|------|------|
| `menu.tsx` | `Menu` — Server Component; paints swirl, intro, CTA, then the card row |
| `menu-intro.tsx` | Eyebrow, `h2`, and the lede tucked beside the third heading line |
| `menu-cta.tsx` | "View full menu" **and** the receipt that slides in behind it on hover |
| `menu-card.tsx` | One product card — index, still, name, price |
| `index.ts` | Barrel — `Menu`, `MenuProps`, `MenuItem` |

The CTA and the receipt are one component because the receipt is anchored to the
section while the link owns the hover state; they render in the design's paint
order so the cards still cover the receipt. Only the entrance translation is
sprung — the receipt's tilt stays a static token, so it slides in from the
bottom-right in screen space rather than along its own axis.

## Locations section — `src/components/locations/`

Figma "Block 3_v2" (`2164:283`) — the clock face with the iced latte turning at
its centre.

| File | Role |
|------|------|
| `locations.tsx` | `Locations` — Server Component; swirl, dial, text groups |
| `locations-dial.tsx` | Clock face, its parallax, and the shared scroll range |
| `locations-cup.tsx` | The cup: perspective lean, scroll turn and parallax |
| `locations-info.tsx` | Eyebrow (with `PulseDot`), address column, opening hours |
| `index.ts` | Barrel — `Locations`, `LocationsProps` |

**The cup carries three motions on three nested elements** — a static
`perspective` container, a pointer-driven lean, and the scroll-driven turn plus
parallax. Keeping them separate is what stops them overwriting each other's
`transform`.

**The turn** is `<SpringTrigger mode="scrub">` mapping `0°…CUP_MAX_ROTATION`
(38°) onto `center center` → `bottom top` of **`turnRange`** — a copy of the
section's box lifted by a fifth of its height (`-top-1/5`), so the turn starts a
fifth of a screen *before* the block fills the viewport, with the same length and
rate as before. `TriggerPos` is a fixed vocabulary, so the lead is carried by the
trigger box rather than by the positions. Parallax owns the arriving half of the
travel (`top bottom` → `center center` of the unshifted `range`); the two overlap
for that last fifth and live on separate nested elements, so they never fight.

> [!important] A `center center` → `bottom top` range needs scroll room below
> A 100lvh **last** section exactly fills the viewport at max scroll, so every
> "fully on screen" pose coincides there and the range never opens. The turn
> simply holds at 0° until a block or footer follows it. The cap must stay **at or below 90°** —
past 3 o'clock the cup carries on over onto its head. It doubles as the speed
control: rate = angle ÷ scroll range. The angle is a constant rather than a token
because spring `from`/`to` take numbers and unit strings; a `var()` would not
animate.

**The lean** uses `@react-spring/web` directly. `<Hover>` is the catalogue's
pointer primitive, but it only fires on enter and leave — it cannot report where
the cursor is — so there is nothing to reuse for a follow-the-pointer effect.
Gate any such component on `springsConfig.disableOnMobile.hover`.

**The parallax** is the difference between the dial's and the cup's drift, not an
effect in itself. Both ends resolve to zero so the block still settles onto the
board exactly.

> [!warning] Pick a trigger range the page can actually reach
> The range ends at `center center`, not the default `bottom top`. For the
> page's **last** section the document stops scrolling before `bottom top`
> arrives, so the animation strands part-way — here at 37.5° of 75°. Progress is
> clamped to `[0,1]` in `useSpringTrigger`, so ending earlier costs nothing: the
> cup simply holds at the cap once it is reached.

## Philosophy section — `src/components/philosophy/`

Figma "Block 4" (`2173:591`) — dark surface, a 3D takeaway cup among floating
coffee beans, four text groups each anchored to its own edge.

| File | Role |
|------|------|
| `philosophy.tsx` | `Philosophy` — Server Component; gradient, scrim, 3D layer, cup box, copy |
| `philosophy-scene.tsx` | Client WebGL layer: loads the cup + bean scenes from `models.glb`, renders both, runs the loop |
| `bean-field.ts` | Pure physics for the beans — wander, drag, walls, cursor push, collisions (`FIELD` tuning) |
| `cup-anchor.ts` | `CUP_ANCHOR` attribute shared by the server layout and the client scene |
| `philosophy-copy.tsx` | Headline, lede, claims, eyebrow |
| `index.ts` | Barrel — `Philosophy`, `PhilosophyProps` |

**One canvas for beans and cup**, at `z-5`: over the scrim (`z-1`), under the
copy (`z-10`), so the beans bounce off the cup instead of passing through it. The
cup is not placed in 3D by hand — the layout still owns it. The figure marked
`CUP_ANCHOR` is the board's cup box (empty, carrying the `alt`); on every resize
the scene projects its rect onto the world plane at z = 0 and stands the cup
there, `CUP.scale` of its height, `CUP.drop` of it below the box so the section's
bottom edge cuts the foot, tilted `CUP.tilt` to the right.

**Beans are weightless rigid bodies** (`bean-field.ts`): mass ∝ scale³, so the
cursor — a push away from its ray plus the wake of its movement, both forces —
flicks small beans and barely nudges large ones. Hits are elastic with Coulomb
friction; the friction is what converts a glancing hit into spin. Fixed 1/120 s
step, so behaviour is identical at 30/60/120 fps. The cursor is ignored until it
has actually moved (an unmoved pointer would sit dead centre). Phones: 16 beans,
DPR ≤ 1, 30 fps drawing, no antialias. Reduced motion: nothing moves.

**Prewarmed with a real draw, not just a compile.** When the .glb lands the
scene uploads every texture, runs `renderer.compileAsync` (non-blocking), then
draws one throwaway frame with the cup posed at rest — long before the section is
near the screen. `renderer.compile` alone left the first draw on arrival to
stall 225–425 ms (three checks link status synchronously on first use, and the
GPU builds its pipeline for the draw) plus ~70 ms allocating the drawing buffer.
The loop only starts (`ready`) once that frame is done.

> [!warning] Anchor to the top unless the element belongs to the viewport edge
> The boards are 800px tall and the sections are `h-lvh`. A bottom-anchored
> element keeps its distance from the window edge while its top-anchored
> neighbours keep theirs from the section top, so the two only line up at exactly
> 800px. The eyebrow here has to sit level with the lede, so it is top-anchored.

> [!warning] Wrap `TextEngine` to position it
> The engine writes `position: relative` as an inline style, so `absolute` on the
> tag itself is overridden and the block silently lands in flow instead. Put the
> positioning on a wrapper. The failure is easy to miss: the first such block
> still looks right, because `top` then acts as a relative offset from zero.

The headline is Geist **SemiBold**. That is why Geist is loaded from Google Fonts
in `app/layout.tsx` instead of `src/fonts`: the local `Geist-Bold.ttf` is a static
instance with no weight axis, so 600 cannot come from it. Building with Bold in
its place made every headline line ~2% wider — the error accumulates across a
line and shows as doubled glyphs toward the right-hand end.
