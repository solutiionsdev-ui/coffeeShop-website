---
tags: [meta, changelog]
updated: 2026-09-12
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-09-12 (perf) — First-scroll freezes: GPU programs now compile under the preloader

The "micro freezes" scrolling out of the hero were **not JavaScript**: long
animation frames carried no script and ~3 ms of rendering. They were the GPU.
Chrome (Skia Graphite on Dawn/Metal) compiles one pipeline per combination of
shape, fill, blend, clip and render target the first time it is drawn,
synchronously on the GPU thread — 190–400 ms each on a cold cache. The hero
needs none of the combinations the lower sections use, so every one of them was
first compiled mid-scroll. Identified from Chrome's own pipeline labels
(`createGraphicsPipeline`), not guessed — method in [[optimize-3d-scene]].

- **`GpuWarmup`** (`common/preloader/gpu-warmup.tsx`) draws one invisible
  sample of each such combination inside the preloader panel: the swirl's own
  blob mask in both its radial and conical phase, the five-stop philosophy
  scrim, clipped and scaled display type, translucent / opaque / turned
  compositor layers. ADR-0023. `ui/swirl-fill.tsx` now exports `blobMask`.
- **Philosophy scene**: `compileAsync` + one real throwaway draw when the .glb
  lands. `compile()` alone left the first draw on arrival to stall 225–425 ms
  (synchronous link-status check, pipeline built at draw time) plus ~70 ms
  allocating the drawing buffer.

Measured on the production build, real Chrome, M1 Pro, 1440×900 @2x, **cold GPU
cache** (fresh profile, macOS Metal cache wiped — a first visit), same harness
before and after:

| | before (2 runs) | after (2 runs) |
|---|---|---|
| first scroll, hero → philosophy: frames > 50 ms | 8 / 7 | 1 / 1 |
| worst frame | 592 / 525 ms | 192 / 217 ms |
| freezes after the preloader lifts (hero entrance) | 525 + 241 + 208 / 508 + 267 + 258 ms | none / none |

Five further cold runs of the final build: worst first-scroll frames 51, 183,
191 and 226 ms, and one 558 ms outlier (plus a 191 ms frame near the hero) in an
untraced run that three traced runs did not reproduce — no pipeline compiled at
those positions in any traced run, so its cause is unknown.

With a warm cache (a returning visitor) the first scroll was already clean of
compile stalls, before and after.

> [!warning] Known residual
> One ~200 ms freeze remains on a **first visit only**, as the locations dial
> fades in: the compositor pipeline for a translucent layer sitting a fraction
> of a pixel off the grid (`CoverBounds + BlendCompose[ImageShaderClamp]`). Five
> sample shapes (pixel-aligned, part-filled tiles, composited images, scaled and
> fractionally translated oversize layers) failed to reproduce its key, so it is
> left rather than papered over. Two small multisampled text/path pipelines
> still compile as the philosophy block arrives, with no measurable stall.

On a cold cache the preloader itself still stalls for 1–3 s while the hero's
own programs compile — as it did before (1.4–2.1 s measured on the original).

Warm-cache scrolling was also measured, and left alone: p95 9–17 ms on a 120 Hz
panel, with an occasional isolated 26–42 ms frame as scrolling starts, when the
hero model begins redrawing every frame (GPU-bound — `MakeCurrent` and
swap-scheduling waits, no script). Rendering the hero canvas at DPR 1.5 instead
of 2, or without `preserveDrawingBuffer`, made no measurable difference over
three runs each, so neither of the model's documented choices was changed.

## 2026-09-12 (night) — No pause before the hero entrance; softer, earlier swirls with parallax

- **`usePageReady.revealing`**: a new flag the preloader sets the moment it
  starts to pour away (before `ready`, which lands when the pour finishes).
  `setReady(true)` implies it. The hero model's entrance keys off `revealing`
  with no delay — waiting for `ready` left the product parked below while the
  panel drained, which read as a pause.
- **Swirl fill**: every blob's rate is solved (`REACH / (100 − delay)`) so all
  of them finish together at `--fill` 100 — the old last blob raced in late
  and slammed the shape shut. Rim `FEATHER` 5 → 14, clock 3.4 s
  ease-in-out-sine, `THRESHOLD` 0.25 → 0.12 so the locations swirl starts
  sooner.
- **Swirl parallax**: a `<SpringTrigger>` scrub on the swirl's box, −100 → 100
  px while it crosses the screen.
- **Locations swirl no longer cut at the top**: `fadeTop` puts a stationary,
  section-sized gradient mask over the swirl, so where it runs past the
  section's top edge (`--size-swirl-y` is −24px, and the parallax moves it) it
  dissolves instead of being clipped straight across.

## 2026-09-12 (fix) — Hero entrance rose sideways

The `intro` group sat above `stage`, so its turn pivoted on the scene origin;
with the saved layout's offset (z = 1 product height) that swung the product
right-to-left as it rose. `intro` now sits between `stage` and `pivot`, so it
turns about the product's own centre and the rise is straight up. `INTRO.turn`
0.35 → 0.25, `roll` −0.06 → −0.05.

## 2026-09-12 (late) — Hero entrance, panel opt-in, swirl fill on its own clock

- **Hero entrance**: once `usePageReady` flips (the preloader has gone) the
  product rises from `INTRO.rise` (0.35) product heights below, turning out of
  `INTRO.turn` / `roll`, over 1.4 s on an ease-out cubic — an `intro` group
  between `drift` and `stage`. Skipped under reduced motion.
- **Model panel is opt-in**: still dev-only, and now only with `?panel` in the
  address (`http://localhost:3007/?panel`).
- **Swirl fill decoupled from scroll**: it starts once, when a quarter of its
  *section* is on screen (`IntersectionObserver`, `THRESHOLD` 0.25) and the
  preloader has gone, then runs on time (2.6 s, ease-in-out cubic) instead of
  being scrubbed — it played late and stalled with the scroll.
  > [!warning] Watch the section, not the swirl
  > The swirl box is larger than its block and reaches up into the one above,
  > so an `<Inview>` on the swirl itself fired at page load — under the
  > preloader — and the fill was already finished when the block arrived.
  > `swirl-fill.tsx` drives `--fill` with `@react-spring/web`'s `useSpring`
  > directly for that reason (the vendored `<Inview>` watches its own box).

## 2026-09-12 (evening) — Hero bleed, scroll drift, per-piece cards, relit bag, bean vortex

- **Hero layout** saved: position `[0.125, −0.049, 1]`, scale 1.155.
- **Hero canvas bleeds** `BLEED` (0.22) past the frame on every side — the
  panel's offset/scale carried the bag past the frame and the canvas edge cut
  it. The fit still solves on the frame; the canvas is just larger.
- **Scroll drift**: a `drift` group above the stage sinks the product by
  `SCROLL_DROP` (0.22 product heights) as the hero scrolls its height away.
- **Per-piece card**: `HeroModel` reports the hovered piece (`onPiece`);
  `HeroMedia` keeps the last one and shows `cards.bag` or `cards.cup`
  (`home.ts`). The card's show/hide is still the product rectangle's `Hover`.
- **Relit**: exposure 1.49 → 1.15, left key 5.8 → 4, right key 0.7 → 1, rim
  0.4 → 0.6, environment 0.025 → 0.045 — the bag's face no longer clips white.
- **Smoother lift**: a per-frame damped spring (`stiffness` 0.004, `damping`
  0.88, just past critical) replaces the exponential chase, so a piece eases
  in as well as out.
- **Swirl fill slower**: range `top center` → `center top` (≈ a screen of
  scroll) plus a spring (`tension` 38, `friction` 26) so it trails the scroll.
- **Bean vortex**: scroll speed drives a swirl about the view axis at the
  depth band's middle (`VORTEX` in `philosophy-scene.tsx`, `vortexCore` /
  `vortexInward` / `vortexSpin` in `FIELD`); it builds and dies away with the
  scroll, reversing with its direction.

## 2026-09-12 (later) — Beans behind the cup, blob swirl fill, one hero transform, per-piece hover

- **Beans** float in `DEPTH` −3…−12 — wholly behind the cup's back face, so
  they pass behind it instead of into it. `BEANS.length` 0.052 → 0.07 to keep
  their on-screen size at the greater depth.
- **Swirl fill** grows out of four round, soft-rimmed blobs (`BLOBS`) that open
  in sequence and merge — radial-gradient mask layers driven by `--fill`, nested
  inside the swirl's own mask — instead of a straight wipe. Range moved later:
  `top center` → `bottom bottom` of the swirl's box.
- **Hero panel is one transform for the whole product** (position in product
  heights, rotation°, scale) on a `stage` group the fit never sees. The
  per-piece layout format is gone; `hero-layout.json` holds the new shape.
- **Hover** lifts only the piece under the pointer (raycast), with a small
  twist; the **cursor lean** is per piece with its own amount and rate, so the
  bag and cup turn toward the cursor out of step.

## 2026-09-12 — Swirls fill from nothing, unified hero coordinates, cup spin, order unpinned

- **Swirl fill**: the faint base layer is gone — the swirl only exists as far
  as the sweep has reached, in its own colour.
- **Hero coordinates unified**: each top-level piece is re-hung from a holder
  at its bounding-box centre, so every model reads the same in the panel and
  in `hero-layout.json` — position = centre in the product frame, rotation 0 /
  scale 1 = the file's pose, rotation about the piece's own centre. The
  exporter's nested transforms (the cup's Z-up turn, ×100/×0.01) stay inside.
  Layouts saved before this change would mean something else; none existed.
- **Philosophy cup** turns about its own tilted vertical axis on scroll
  (`CUP.spin` 1.2π across the section, wordmark to the lens mid-section), on a
  `spin` group under the tilt.
- **Order** no longer pins: `TRACK_VH` 100, the receipt feeds from −0.85vh to
  the moment the block fills the screen, then the page scrolls on — the
  remaining pinned travel was the pause before the footer.

## 2026-09-11 (night) — Swirl fills, earlier receipt, no pause before the footer

- **Swirl fill** (`components/ui/swirl-fill.tsx`): the menu and locations
  swirls are now a faint base (40%) with the full-strength colour swept across
  them on scroll — menu **left → right**, locations **right → left**. A
  `<SpringTrigger mode="scrub">` over the swirl's own box (`top bottom` →
  `center center`) springs a single custom property, `--fill` 0→100, which an
  `inset()` clip reads.
  > [!note] Why a custom property
  > `useSpringTrigger`'s `interpolate` reads one number per value, so a
  > four-value `inset(…)` cannot be scrubbed directly. One number can, and
  > react-spring writes `--*` keys with `setProperty`.
- **Order receipt** starts at `START_VH` −0.45 (before the stage pins) and
  finishes at `END` 1 (as it unpins); the track dropped from 340 to 240vh so the
  feed keeps roughly its old length (~185vh) while the ~43vh pause that used to
  sit between the finished receipt and the footer is gone.

## 2026-09-11 (evening) — Hero layout fixed, bag normals, dev model panel

- **Hero pose restored to the file's own composition** — cup front-left, bag
  behind on the right. The half turn (`REST_YAW = π`) carried over from
  `coffee.glb` mirrored it; the turn is now `yaw` in `src/data/hero-layout.json`
  (0). The pose is the .glb's unless the layout file overrides a piece.
- **Bag normals**: the export writes the bag's `normalTexture.scale` as **3.3**,
  which shaded every fold as a black stripe. `NORMAL_STRENGTH` (1) is applied to
  every normal map at load, keeping the loader's flipped-y sign. Re-creasing the
  normals was tried and dropped — it was not the cause.
- **Dev model panel** (`hero-model-panel.tsx`, dev builds only via
  `HERO_PANEL`): the product's `yaw` and each top-level piece's position,
  rotation (degrees) and scale, applied live — the product re-measures and the
  camera re-fits on every change, so what you see is what a reload gives.
  **Save** POSTs to `app/api/dev/hero-layout/route.ts`, which zod-validates and
  writes `src/data/hero-layout.json`; it answers 404 outside `next dev`.
  **Reset to file** returns to the .glb's placement. Pieces are keyed by node
  name, so a re-export that renames nodes falls back to the file's placement.

## 2026-09-11 (later) — Re-exported hero model; philosophy beans and 3D cup

- **`models.glb` re-exported** with three scenes: `Scene` (default) is the hero
  composition — bag (`Mesh_0`) and cup, no plinth; `Scene.001` the cup alone;
  `Scene.002` a single coffee bean (`COFFEE_MAT`). The hero loader takes the
  first scene holding a mesh, i.e. the composition. `REST_YAW` is back to π,
  and the bag and cup lift separately again, told apart by height (each
  top-level node of the scene is a piece).
  > [!warning] Far plane vs. long lens
  > The composition is ~13 units tall; at `FIELD_OF_VIEW` 8° the fitted camera
  > stands ~127 units back — past the old fixed `far` of 100, which clipped the
  > whole product to an empty canvas with no error. `near`/`far` now ride the
  > fitted distance.
- **Philosophy block gets a WebGL layer** (`philosophy-scene.tsx` +
  `bean-field.ts`): weightless coffee beans (34 desktop / 16 phone, one
  `InstancedMesh`, log-uniform scale 0.55–1.7) drifting on a slow air wander,
  pushed away from the cursor's ray, bouncing off each other and the cup with
  restitution and friction (friction is what spins them). Fixed 1/120 s physics
  step. The photographed cup is replaced by the cup scene from `models.glb`,
  tilted right and cut by the section's bottom edge; its place still comes from
  the layout via the `CUP_ANCHOR` figure. See [[common#Philosophy section — `src/components/philosophy/`]].

## 2026-09-11 — New hero model, earlier cup turn, order background parallax

- **Hero model** is now `public/assets/hero/models.glb` — a single branded
  takeaway cup (two meshes, Sketchfab export) replacing `coffee.glb`'s
  bag + cup + plinth. `hero-model.tsx` no longer splits the mesh
  (`split-product.ts` deleted) or re-creases its normals; `PRODUCT` is the whole
  box, the hover lifts the whole cup through a `lift` group, and `REST_YAW`
  turns the wordmark to the lens.
  > [!warning] The file's default scene is empty
  > `models.glb` exports an empty `Scene` at index 0 and the cup in
  > `Scene.001`, so `gltf.scene` is empty. The loader picks the first scene that
  > holds a mesh instead of trusting the default.
- **Locations cup turn** starts a fifth of a screen earlier: its range is
  measured on `turnRange`, the section box lifted by `-top-1/5`
  ([[common#Locations section — `src/components/locations/`]]).
- **Order background** now has a scroll parallax: a `<SpringTrigger mode="scrub">`
  over `top bottom` → `top top` of the track, the photo box `1 + BG_PARALLAX`
  (0.3) of the frame tall, lagging by up to 30% of the frame and landing flush as
  the block pins. Costs some crop at the photo's sides; tune `BG_PARALLAX`.

## 2026-08-28 — Footer, printer fix, and real site metadata

**The receipt now leaves the slot, not the shadow under the bar.** The printer
art was drawn over the paper, so the sheet only became visible below the bar's
lower lip. Real paper hangs in *front* of the printer's face, so the bar moved
behind the print window (z-index 1 against 2). The bar is 400 wide against the
paper's 328, so its lip still shows either side — which is what the board draws.
The receipt's leader dropped from 46px to 32 now that nothing covers it.

**Footer** — Figma "Concept 6" (`2173:655`), a 385px band rather than a viewport
section. Mounted in the root layout beside `<SiteHeader>`, since it is site
chrome, not a page section. Frame diff **4.15**, wordmark **1.49** at (0,0).
Its swirl is the shared mask at `rgba(23,23,21,0.5)` — a new
`--surface-backdrop-soft`.

**Metadata, icons and Open Graph**, all generated from the wordmark mask:

| | |
|---|---|
| `siteConfig` | real name, title, description, `themeColor: #070707`, plus a `business` block (email, phone, hours, three addresses) |
| JSON-LD | Organization + WebSite + **three `CafeOrCoffeeShop` nodes**, one per location, with addresses and opening hours |
| icons | favicon 16/32/48, android 36→192, apple 180 — the wordmark's `b`, white on the brand black |
| Open Graph | 1200×630, wordmark over `#070707`; the generator was declaring 900×600 for it |
| `manifest.json` / `browserconfig.xml` | real name, brand colours |

> [!warning] `src/app/favicon.ico` wins over `public/favicon.ico`
> The App Router picks up `src/app/favicon.ico` and serves it ahead of the one in
> `public/`, so replacing only the public copy left the starter's icon live.
> Both are now written. The app-router copy must also be **RGBA** — an RGB `.ico`
> fails the build outright with *"The PNG is not in RGBA format!"*.

`NEXT_PUBLIC_SITE_URL` is now `https://brewns.coffee` in `.env`, taken from the
receipt's own `BREWNS.COFFEE`. `.env.example` keeps its neutral placeholder.

## 2026-08-27 — Block 4: eyebrow anchored to the top

`// OUR PHILOSOPHY` was the block's only bottom-anchored element (`bottom-10`);
everything else, including the lede it must sit level with, is anchored to the
top. At the board's own 800px height the two coincide, so it measured correct
and looked correct. At any other height they drift — on an 834px window, which
is what the report came from, they were **35px apart**.

Now top-anchored at the board's `y = 743`. Verified across viewport heights:

| viewport | eyebrow top | lede last line | gap |
|----------|-------------|----------------|-----|
| 800 | 743 | 742 | 1 |
| 834 | 743 | 742 | 1 |
| 900 | 743 | 742 | 1 |
| 1000 | 743 | 742 | 1 |

Was 1 / 21 / 61 / 101 before.

> [!warning] Bottom-anchoring inside a `100lvh` section only matches the board at 800px
> The boards are 1440×800 and the sections are `h-lvh`, so any element pinned to
> the bottom holds its distance from the viewport edge while its neighbours hold
> theirs from the section top. Pin to the bottom only when the element genuinely
> belongs to the viewport edge and nothing has to line up with it — the hero's
> info bar qualifies, this eyebrow did not.

**The cup was already correct.** Checked against Figma's own render of node
`2270:3525` at its display size: mean |Δ| **1.95**, a uniform −1.5/−1.1/−0.7
from webp encoding. If the old one is still on screen it is a stale copy in the
browser — the optimiser serves `must-revalidate` with a content ETag, so a plain
reload picks up the change.

## 2026-08-27 — Hero gradient: quicker flow, stronger touch

| key | was | now |
|-----|-----|-----|
| `speed` | 0.07 | 0.12 |
| `pointerStrength` | 0.8 | 1.2 |
| `iridescence` | 0.20 | 0.22 |
| `parallax` | 0.0015 | 0.01 |

**Flow is 1.68× faster and no choppier.** Measured as how far the field travels
in a fixed slice of wall time, the ratio is **1.68× at 100 ms, 250 ms, 500 ms and
1000 ms alike** — scaled uniformly, so no interval gained a disproportionate jump.
`speed` only multiplies `iTime` into `t`; it never touches the frame clamp, the
accumulating clock or the pointer rig, so smoothness is structurally unchanged.

> [!note] Measure flow with `grain` and `dither` off
> `grainAnim` reseeds the grain 24×/s from `floor(iTime * 24)`, independent of
> `speed`. Any sample gap over ~42 ms therefore reseeds it completely and the
> per-pixel difference swamps the field's own motion — the first attempt read
> 1.0× at 100 ms and 1.19× at 1 s, which is the grain, not the flow.

**The touch is ~a third stronger:** peak Δ 25 → 34, mean Δ 5.51 → 7.18.

> [!important] Reach for intensity before radius
> `pointerRadius` buys visibility cheaply — 0.30 → 0.38 lifted mean Δ from 5.99
> to 7.41 at no contrast cost — but it walks straight back toward the wash that
> made the pointer feel absent in the first place. The measured edge-energy
> ratio (0 = tight spot, 1 = even wash) goes 0.23 → 0.58 over that step. Radius
> stays at 0.30; `pointerStrength` and `parallax` carry the increase instead.
> `pointerStrength` past ~1.2 does little: the film is a cosine of thickness, so
> pushing further rotates the phase rather than brightening.

**Contrast improved to 7.39:1** (from 7.27), measured over 154 moments × an 11×8
grid of resting pointer positions. `parallax` at 0.01 nudges the field with the
cursor, which happens to move the bright patch off the copy slightly more often
than it moves it on.

> [!warning] `speed` reparametrises time — comparisons must fix `t`, not `iTime`
> Sweeping the same `iTime` list at two speeds looks at two different sets of
> fields; an early run read 11.54 that way and looked like a huge improvement it
> had not earned. The reachable field set is speed-independent, so worst-case
> contrast is too: sweep in `t` space, or measure once at any speed. Verified —
> 9.47 vs 9.42 for identical `t` coverage at 0.07 and 0.12.

## 2026-08-27 — Block 4: cup refreshed and re-seated

Two corrections after re-checking against the board.

**The board had changed.** Re-fetching Figma and diffing the two exports showed a
single altered region — `x 268..522, y 320..760`, the cup, everything else 0.0.
The image fill itself is byte-identical; what changed is the node's colour
treatment. The old render sat at R −6.5 / G +1.5 / B +11.5 against the raw fill,
the new one at −1.2 / −0.9 / −0.8 — the adjustment was essentially removed. The
asset is rebuilt from the new render.

> [!warning] `get_design_context` and `get_metadata` disagreed on the cup's `y`
> The context said `top-[311px]`, the metadata `y=313`. **The metadata was
> right.** Two pixels sounds like nothing, but the cup's coffee-to-milk boundary
> is a steep edge, so a 2px slip put the region diff at 8.07 and made the colour
> read as wrong by R −12 / B +9 — the sample rect was landing on different
> content, not on a tinted version of the same content. Corrected, the cup
> aligns at (0,0) and the region diffs at **1.87**; the block is **4.41**.
>
> **Align on an element's own bright content, not a padded box.** A ±3 search
> over a box with lots of background around it reported (0,0) and hid this; a
> tight search over the cup body found it immediately.

> [!warning] The starter's cookie re-open control covers design text in every block
> It sits bottom-left and overlaps the hero's info bar, the menu's card row, the
> locations addresses and the philosophy eyebrow — four for four. Reported as
> "the text is positioned wrong"; the text is in fact exact (eyebrow bbox within
> 1–3px of the board). Awaiting a decision — removing a consent re-open control
> is not a call to make silently.

## 2026-08-27 — Philosophy block (Block 4)

Built Figma "Block 4" (`2173:591`) as `components/philosophy/` and added it under
the locations block. Back to the dark surface, so `--raw-color-espresso-900` /
`--surface-backdrop` / `--color-backdrop` are reinstated — they were removed when
the hero's swirl gave way to the Opalesce canvas, and this block wants that same
tint. The swirl mask itself is byte-identical to `assets/shared/swirl-mask.webp`
again, so nothing new was added there.

Geometry is exact: cup `[234,311,322,482]`, headline `[40,106,788,173]`, lede
`[613,665,331,96]`, claims `[1228,705,172,54]`. Region diffs: cup 1.87, swirl
0.18, lede 22.95, claims 11.77, eyebrow 9.66.

> [!warning] `TextEngine` sets `position: relative` inline — a positioning class on the tag loses
> Both text blocks here are absolutely placed, and putting `absolute left-… top-…`
> on the `TextEngine` tag silently did nothing: the engine's own inline style
> wins. The headline happened to land correctly because it was the first in-flow
> child and `top` then read as a relative offset from 0; the lede, flowing after
> it, ended up **173px low — exactly the headline's height**. Wrap the engine in
> a positioned element instead. Blocks 2 and 3 never hit this because their
> `TextEngine`s sit inside a flex column.

> [!important] Geist moved from `src/fonts` to Google Fonts
> The board sets this headline in Geist **SemiBold** (600). `src/fonts` shipped
> only `Geist-Bold.ttf`, a static instance — no `fvar`, `usWeightClass` 700 — so
> 600 could not be synthesised. Built with Bold first, the headline came out
> **2% wider per line** (+13, +14, +8px at the line ends) because Bold's glyphs
> are wider and the error accumulates left to right; the block diffed at 9.25.
>
> Geist is on Google Fonts with a full weight range, so `next/font/google`
> replaces the local file and supplies 600 and 700 together. Line ends are now
> **+0, +4, −1px** and the block diffs at **4.40**.
>
> The switch is neutral for weight 700: the menu, whose heading is Geist Bold at
> 100px, diffs at 2.72 against 2.73 before. `src/fonts/Geist-Bold.ttf` is now
> unused — kept for now in case the family is brought back local.

> [!note] The image fill exported empty again
> Same failure as the locations dial: `get_design_context` gave a fully
> transparent PNG for the cup. Recovered the same way — `download_assets`, then
> the node render's RGB combined with the raw fill's alpha, because the render
> bakes in the background and the raw fill is off-tone (R −6.5, G +1.5, B +11.5).
> Assume this is the normal case for image fills in this file, not the exception.

**Block 3's cup rotation is now live.** It was mapped to `center center` →
`bottom top`, which needed scroll room after the block; with Block 4 below it,
the turn runs 0° → 7.5° → 15° → 22.5° → 30° across scroll 1600–2400 exactly as
designed. Nothing was changed to make that happen.

## 2026-08-27 — Hero gradient responds to the pointer

Three CONFIG values now differ from `docs/opalesce.md`, all of them to make the
pointer visible and all of them agreed rather than assumed:

| key | spec | here |
|-----|------|------|
| `cursor` | 0 | 1 |
| `pointerRadius` | 0.75 | 0.3 |
| `pointerStrength` | 0.15 | 0.8 — the spec author's own shipped value |
| `iridescence` | 0.1 | 0.2 |

> [!important] `pointerRadius: 0.75` is wider than the canvas
> This is what actually made the pointer feel absent, and it is not an amplitude
> problem — raising `pointerStrength` and `iridescence` first only made the
> invisible thing brighter. `uv` is scaled by height, so a gaussian of radius
> 0.75 on an 800px-tall frame washes the entire field evenly: nothing tracks the
> cursor because the touch is everywhere at once. Measured as a column profile
> of the pointer-only difference across the frame's width:
>
> ```
> radius 0.75  455333455421137889754346   flat — a wash
> radius 0.30  014665556410036777779852   two humps, on the two cursor positions
> ```
>
> 0.3 is about a third of the frame height, which reads as a soft patch under the
> hand. Contrast is unaffected: still 7.27:1.

> [!important] `iridescence` is the gate, not `pointerStrength`
> Turning `cursor` on alone changed the picture by **1.63/255 on average — 0.6%**,
> which is below the threshold of perception on a field this dark and this slow.
> It looked broken and was not. The touch reaches the composite only through
> `mix(vec3(1.0), film * 1.25, uIridescence)`, so at `iridescence: 0.1` the
> multiplier can only travel between 0.9 and 1.025 however hard `pointerStrength`
> pushes: measured, it saturates around 16/255 at any strength. Raising
> `iridescence` is the only thing that opens it up.
>
> | pointerStrength / iridescence | max Δ | mean Δ | worst contrast |
> |---|---|---|---|
> | 0.15 / 0.1 | 7 | 1.63 | 7.46 |
> | 0.6 / 0.1 | 17 | 4.14 | 7.46 |
> | 0.8 / 0.1 | 16 | 3.96 | 7.46 |
> | **0.8 / 0.2 — shipped** | **30** | **7.20** | **7.27** |
> | 0.8 / 0.3 (author's) | 44 | 10.44 | 7.10 |

Measured with the ambient field frozen — **both renders at the same `iTime`**, so
only the pointer differs — the touch moves the frame by a mean of 3.42/255 and a
peak of 12, concentrated on the cursor. `parallax` is untouched.

> [!warning] Do not verify a pointer effect with two screenshots taken seconds apart
> The field animates on its own, so any two live captures differ regardless of
> the pointer. An early check here reported a "settled left vs right" delta of
> 3.1 and proved nothing at all — that number was ambient drift. Hold `iTime`
> fixed and move only `iMouse`.

Nothing else was needed: the spec's engine already carries the whole pointer rig,
and `hero-gradient.tsx` only skipped attaching the handlers while `cursor` was 0.
It also costs nothing per frame — `trail()` was already being evaluated every
frame with the pointer parked at the origin, so switching it on moves a gaussian
that was being computed anyway.

**Smoothness** is the three-node rig, and it is measurable. After an instant jump
the body node — the one the field actually follows — reaches 50% in ~433 ms, 90%
in ~1.07 s, 99% in ~1.93 s:

| refresh | 50% | 90% | 99% |
|---------|-----|-----|-----|
| 60 Hz | 433 ms | 1067 ms | 1933 ms |
| 120 Hz | 433 ms | 1075 ms | 1967 ms |
| 144 Hz | 438 ms | 1083 ms | 1965 ms |

Identical across refresh rates, which is the point of the spec's `s` factor —
every follower steps by elapsed time, not by frame count. 250 ms after a jump the
three nodes sit at lead 0.83, body 0.30, wake 0.03; that spread is what stretches
the trail into a tapered ribbon instead of a disc.

> [!important] The pointer costs contrast — re-measured, still above the floor
> `trail()` feeds film thickness, so a cursor parked over the copy tints what is
> behind the headline. Final measurement at the shipped values: an 11×8 grid of
> resting pointer positions across 24 moments gives **7.27:1**, against 9.5:1
> with the pointer parked at the origin. Above the 7:1 floor, so the scrim is
> unchanged — margin ~3.9%.
>
> **Sweep the pointer grid finely.** A coarse 5×3 grid reported 7.45 and missed
> the worst resting position entirely; 11×8 found 7.27 at `mouse (0.76, -0.55)`.
> Re-measure with a fine grid if `pointerStrength`, `iridescence` or the scrim
> ever moves.

## 2026-08-27 — Hero background is the Opalesce WebGL2 gradient

The board's masked grey swirl is gone; the hero now renders `docs/opalesce.md`'s
thin-film shader on a section-sized canvas. The spec stays in the repo because
CONFIG is unreadable without it.

**The shader and the engine are transcribed verbatim** — same sha256 as the
spec's fenced block, 6659 chars. The palette lives in CONFIG only. Kept as the
spec insists: the three-node pointer rig, the accumulating clock
(`clock += ms * 0.001`, never wall time) and the `[4.167, 50]` ms frame clamp.

Only the size binding is rewritten, which the spec itself calls for: `resize()`
reads `canvas.clientWidth/clientHeight`, a `ResizeObserver` on the canvas
replaces the window `resize` event (still coalesced to one call per frame), and
`aim()` works off `getBoundingClientRect()`. At `cursor: 0` no pointer handler is
attached at all.

Three gaps in the spec, filled exactly as its own "Известные пробелы" section
prescribes: `hexToVec3` implemented, `CONFIG.cursor` left as JS-only with no
uniform, `iMouseVel` kept even though the linker drops it —
`gl.uniform2f(null, …)` is safe.

| Removed | Why |
|---------|-----|
| the hero's swirl layer, and `swirlMask` from `HeroMediaProps` | the canvas takes its place — the prop lived in the type, the destructure, the JSX *and* the mock |
| `--raw-color-espresso-900`, `--surface-backdrop`, `--color-backdrop` | the dark swirl tint had no other consumer; blocks 2 and 3 tint theirs with `--surface-inverse-backdrop` |

The swirl asset and the `--size-swirl-*` tokens stay — blocks 2 and 3 still use them.

**No seam:** `body` and the section are both already `#070707`, the shader's own
`bgColor`.

**Contrast.** Measured on the worst frame, not an average: the shader was swept
off-page across its clock and the whole copy column sampled with the scrim
composited in. Worst over 10 000 s at 1440×800 is **7.61:1** — above the 7:1
floor, so the scrim was left as specified. The tight spot is always x≈523–528,
the right edge of the headline column where the scrim has decayed to ~0.32.
1920×1080 measures 8.47:1: the column ends at 33.5% of the width there against
36.6% at 1440, so more of the scrim covers it. **1440×800 is the tight case** —
re-measure there if the scrim or the column width ever changes.

## 2026-08-27 — Cup stands still while its block is the screen

The turn was mapped onto the block's *entry*, so by the time the block had
settled the cup was sitting at its full 30° — the reader's whole time on the
screen was spent looking at the one frame that does not match the board.

Turn and parallax now occupy opposite halves of the block's travel:

| Motion | Range | Behaviour |
|--------|-------|-----------|
| parallax | `top bottom` → `center center` | plays as the block rises in, resolves to 0 |
| turn | `center center` → `bottom top` | starts only as the block leaves upward |

The payoff: the resting frame is now a **true 1:1 with the board — 1.30 mean abs
diff with nothing neutralised**, where previously the cup had to be reset by hand
to measure it at all.

> [!important] The turn has no room to run until something follows this block
> At max scroll a 100lvh last section exactly fills the viewport, so
> `top top`, `center center` and `bottom bottom` all coincide there — there is no
> scroll left after "fully on screen". Measured today: 0° across the entire
> reachable range. Appending a placeholder block below immediately brings it to
> life — 0° → 7.5° → 15° → 22.5° → 30°. Nothing to fix; it activates by itself
> when block 4 or a footer lands. Giving *this* section a taller scroll runway
> with a sticky inner would also do it, at the cost of the block no longer being
> exactly one screen tall.

## 2026-08-27 — Cup: shorter turn, pointer-driven perspective, parallax

Three motions now sit on three nested elements in `locations-cup.tsx`, so none
of them fights the others for `transform`:

| Layer | Motion | Driver |
|-------|--------|--------|
| container | `perspective: 900px` | static — gives the lean below its depth |
| middle | lean, ±14° on each axis | pointer position across the section |
| inner | turn 0°→30° **and** parallax 80px→0 | scroll (`<SpringTrigger mode="scrub">`) |

- **Turn cut again**, 45° → **30°** (1:00). Rate is now 0.038°/px, down from
  0.123°/px when the block was first built — 3.3× slower overall.
- **Parallax** is the *difference* between the two images' drift: the cup lags
  80px as the block rises, the dial 26px. Both resolve to zero at the end of the
  range, so the block still settles onto the board exactly — verified, the rest
  frame is 1.30 against 1.28 before the change, and both boxes are unmoved.
- **The lean** talks to `@react-spring/web` directly. `<Hover>` is the catalogue's
  pointer primitive but it only knows enter and leave, not *where* the cursor is,
  so there was nothing to reuse. It is gated on `springsConfig.disableOnMobile.hover`,
  so it never runs where there is no pointer.

Measured: turn 0° → 7.5° → 15° → 22.5° → 30°; cup parallax 80 → 60 → 40 → 20 → 0
against the dial's 26 → 20 → 13 → 7 → 0; lean 0° dead centre, ~±9° at the edges.

## 2026-08-27 — Locations block, with the cup turning on scroll

Built "Block 3_v2" (Figma `2164:283`) as `components/locations/` and added it
under the menu block. Layout matches the board to the pixel: dial
`[393,106,654,654]`, cup box `[580,190,280,420]`, all three text groups exact.

| Change | Why |
|--------|-----|
| Cup rotation via `<SpringTrigger mode="scrub">`, 0°→45° | Scroll-driven, so the turn runs at the reader's own pace and reverses when they scroll back |
| Trigger range ends at `center center`, not `bottom top`, and is measured against the whole section | See below |
| `PulseDot` reused for the OUR LOCATIONS dot | Same component as the header's ORDER ONLINE dot, so both blink in step |
| `--size-hero-hours` → `--size-hours` | The 122px OPEN DAILY box is the same in the hero and here |

> [!warning] `bottom top` is unreachable for the page's last section
> The first attempt used the default `start="top bottom" end="bottom top"`. The
> document stops scrolling once the last section fills the viewport, so
> `bottom top` never arrives and the cup stranded at **37.5°** — exactly half
> its arc. `center center` is reached while the block is fully on screen, and
> `useSpringTrigger` clamps progress to `[0,1]`, so the cup holds at the cap
> however many sections are added below. Verified across the scroll range:
> 0° → 19.7° → 44.3° → 75°, never beyond.

> [!warning] The dial's image fill exports as a transparent PNG
> Figma's own generated code points at an image fill that downloads with
> `alpha max 0`. `download_assets` gives a usable raw fill and a node render,
> but each is wrong on its own — one has the alpha, the other the tone. The
> shipped asset is the render's RGB with the raw fill's alpha; using the raw
> fill as-is left the dial at (230,226,223) against the board's (248,247,246)
> and pushed the frame diff to 5.85. Rebuilt, it is 1.28. Written up in
> `DESIGN-MAP.md`.

## 2026-08-27 — Menu heading reveals without a clip

The menu `h2` used the hero's clipped line reveal (`overflow` + `lineOut` at
`y: 110%`). A clip-based reveal shows a **sliced glyph for as long as the line is
travelling** — that is the mechanism, not a bug in the geometry: the settled
heading measured 332..404 against Figma's 333..403 at every viewport tested
(1280x720 through 1920x1080).

It still reads as broken here, because unlike the hero — which plays on load,
before anyone is looking — this block animates *as the reader scrolls onto it*,
so the half-cut frame is exactly what they arrive on. The heading now rises and
fades instead (`lineOut: { y: 24, opacity: 0 }`, no `overflow`), so no frame ever
truncates a letter. Dropping the clip also lets the container carry the design's
own `leading-headline` (0.9) directly, instead of `leading-display` (1.1) plus a
`-my-[0.1em]` correction.

The hero still uses the clipped reveal, on purpose — it is above the fold and
finishes before the page is read. Worth aligning the two if the clip is dropped
there as well.

## 2026-08-27 — Menu block, and the nav becomes one shared header

Built "Block 2" (Figma `2149:5`, hover board `2229:145`) as `components/menu/`
and added it under the hero on `/`.

| Change | Why |
|--------|-----|
| Nav extracted to `components/common/header/SiteHeader` | Both boards draw the same bar from the same masks, so it is one fixed header for the page, not a per-section copy. It recolours from `[data-header-theme]` on whichever section its centre line is over |
| Light-surface palette: `--surface-inverse`, `--surface-inverse-backdrop`, `--foreground-inverse` | The menu block inverts the page |
| Shared geometry tokens lost their `hero-` prefix | Swirl, wordmark, dot, arrow, rule and cap-height boxes turned out to be identical in both boards |
| `swirl-mask.webp` / `wordmark-mask.webp` moved to `public/assets/shared/` | Both boards export them byte-identically and both sections are on one page — two copies meant 85 KB downloaded twice |
| `ArrowGlyph` moved to `components/ui/` | Now used by both boards' text links |
| Card still `frame` / `crop` values live in the mock, not in tokens | They describe the photograph, not a design decision — a different shot needs different numbers |

> [!warning] A constant shared with a Server Component cannot live in a `"use client"` file
> `HEADER_THEME_ATTRIBUTE` first sat in `site-header.tsx`. Every export of a
> client module imported into a Server Component arrives as a *client
> reference*, not its value, so the computed JSX key silently produced no
> attribute and the header never changed colour. It now lives in the plain
> `header/header-theme.ts`. Anything a server and a client component both need
> belongs in a module with no directive.

> [!warning] Figma's numbers for a rotated node describe two different rectangles
> `x`/`y` is the rotated rect's top-left **corner**; `width`/`height` is its
> **axis-aligned bounding box**. Reading `y` as the bbox top put the receipt
> 145px low. The bbox also cannot give you the rotation's sign — ±θ produce the
> same box — so the direction has to come from matching a corner. Both are
> written up in `DESIGN-MAP.md`.

Still not designed: tablet and mobile, for either block.

## 2026-08-25 — ORDER ONLINE dot: accent colour + pulse

Figma recoloured the status dot (`1312:289`) from white to `#D58C3D`; re-fetched
and confirmed by diffing the frame export — 26 pixels changed, nothing else.

- New `--raw-color-amber-500` → `--accent` → `--color-accent`; the dot is `bg-accent`.
- New `HeroPulseDot` — the dot now blinks on a loop.

> [!warning] A looping spring plus `skipAnimation` is a hot loop
> `<ReducedMotion>` sets react-spring's global `skipAnimation`, which resolves
> every spring instantly. A spring with `loop` under that flag finishes and
> re-fires without yielding, and it locked the main thread hard enough to hang
> the page. `HeroPulseDot` therefore keeps `reduced` as **tri-state** and only
> arms the loop once the media query has actually been read — never on the first
> render. Any future looping animation needs the same guard.

## 2026-08-25 — Hero section from Figma

Ported the `Concept 7` hero (Figma `1276:566`, 1440×800) into `src/components/hero/`
and wired it into the home view. Node IDs, assets and open design questions are
recorded in `DESIGN-MAP.md` at the repo root.

| Change | Why |
|--------|-----|
| Brand palette + hero geometry tokens in `globals.css` | Every Figma value the 4px spacing scale could not express is a `--raw-size-hero-*` primitive with its source px in a comment |
| Dropped the light/dark `prefers-color-scheme` override | The board is a fixed dark brand palette; a light theme would break it |
| `Geist-Bold` / `SpaceMono-Regular` / `Allura-Regular` via `next/font/local` | The three faces already shipped in `src/fonts/`; bound as `--font-display` / `--font-mono` / `--font-script` |
| Grid base width 1920 → 1440 | Only the 1440 board exists, so `AdaptiveGrid` now scales *that* layout up instead of switching to a 1920 base it has no design for |
| `columnGap={0.2}` on both `TextEngine` blocks | The engine's 0.3em default word gap is wider than the fonts' own space (0.2em), which pushed "FOR YOUR" onto a third line |
| Headline uses `leading-display` + `wrapLineClassName="-my-[0.1em]"` | The design's 0.9 leading would clip glyphs under `overflow`; the clip box stays at 1.1 and the negative margin restores the 90px visual rhythm ([[text-engine]]) |
| `verify.sh` duration regex narrowed | `\bduration-(fast\|normal)\b` also matched inside `duration-[var(--duration-fast)]` — the form the rule itself prescribes — so every correct usage failed the run |

Not designed yet: tablet and mobile. Below 1024 the desktop composition is
rendered as-is.

