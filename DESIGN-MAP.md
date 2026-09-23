# Design map — Get Layers / Concept 7

**Figma file key:** `WINXFW2nTM7zYwd5dGgm1T`
**Source URL:** https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1276-566
**Frame width:** 1440 × 800 (frame name `Concept 7`) — matches the `1440` adaptive-grid
base, so 1 rem = 16 px = 1 design px at that width.

Only 1440 desktop frames exist. There is **no tablet or mobile frame**, so the
≤1024 and ≤640 grid breakpoints render the desktop composition rather than a
designed one — see "Open questions".

> [!important] Cross-check `get_design_context` against `get_metadata`
> They can disagree. On Block 4's cup the context gave `top: 311px` and the
> metadata `y: 313` — the metadata matched the render. Prefer the metadata for
> position, and verify by aligning on the element's own bright content rather
> than a padded box, which hides small offsets.

> [!important] How Figma reports a rotated node
> For a rotated node the metadata's `x`/`y` is the **rotated rectangle's
> top-left corner**, while `width`/`height` is its **axis-aligned bounding
> box** — two different rectangles. Reading `y` as the bbox top puts the node
> ~145px out (this happened with the receipt). The bbox also cannot tell you the
> rotation's *sign*: ±θ give an identical box, so match a corner to settle it.

| Section | Node ID | View / component | Background | Notes |
|---------|---------|------------------|------------|-------|
| Site header | `1312:276` / `2149:11` | `components/common/header/SiteHeader` | — | one fixed bar for the page; recolours per section |
| Hero | `1276:566` | `views/home` → `components/hero/Hero` | `--background` (#070707) + masked swirl | holds the page's only `h1` |
| ├ swirl backdrop | `2161:188` / `2161:183` | `HeroMedia` | `--surface-backdrop` (#171715) | alpha mask, bleeds left/top/right |
| ├ product still | `1312:322` | `HeroMedia` | — | 1153×976 at (385, 29); overflows the frame bottom |
| ├ top bar | `1312:276` | `HeroNav` | — | links `1312:278`, wordmark `1312:286`, order link `1312:287` |
| ├ copy column | `1312:290` | `HeroCopy` | — | eyebrow `1312:293`, h1 `1312:294`, script `1312:295`, lede `1312:297`, CTA `1312:298` |
| └ info bar | `2161:207` | `HeroInfoBar` | — | hours `1312:307`, address `1312:311`, social `1312:315` |
| Menu | `2149:5` | `views/home` → `components/menu/Menu` | `--surface-inverse` (#f1f1ef) + masked swirl | the light half of the page |
| ├ heading column | `2161:180` | `MenuIntro` | — | eyebrow `2149:28`, h2 `2149:29`, lede `2149:32` |
| ├ view-full-menu | `2149:31` | `MenuCta` | — | receipt `2229:207` lives here too — see below |
| └ cards | `2190:828`, `2229:18/23/28` | `MenuCard` ×4 | — | stills `2246:1351/1410/1412/1353` |
| Menu on hover | `2229:145` | `MenuCta` | — | adds only the receipt; everything else is identical to `2149:5` |
| Philosophy | `2173:591` | `views/home` → `components/philosophy/Philosophy` | `--background` + masked swirl | headline is Geist SemiBold — see the font note |
| ├ cup | `2270:3525` | `Philosophy` | — | image fill exports empty; rebuilt from render RGB + raw alpha |
| └ text groups | `2188:720`, `2190:820`, `2190:819`, `2188:719` | `PhilosophyCopy` | — | headline, lede, claims, eyebrow |
| Locations | `2164:283` | `views/home` → `components/locations/Locations` | `--surface-inverse` + masked swirl | clock face with the cup turning at its centre |
| ├ dial + cup | `2190:1078` / `2246:1446` | `LocationsDial` | — | cup rotates 0°→75° on scroll — see below |
| └ text groups | `2188:739`, `2188:737`, `2188:738` | `LocationsInfo` | — | eyebrow (pulsing dot), addresses, hours |

## Assets — `public/assets/hero/`

| File | From | Role |
|------|------|------|
| `hero-product.webp` | `1312:322` | product still (1363×1154 source, drawn at 1153×976) |
| `hero-swirl-mask.webp` | `2161:183` | **alpha mask** for the swirl — painted with `--surface-backdrop` |
| `hero-logo-mask.webp` | `1312:286` | **alpha mask** for the `brewns` wordmark — painted with `--foreground` |
| `hero-arrow.svg` | `1312:301` | CTA arrow — path inlined in `hero-glyphs.tsx` so it inherits `currentColor` |
| `hero-dot.svg` | `1312:289` | ORDER ONLINE status dot (#D58C3D) — reproduced as a `rounded-full bg-accent` span that pulses |
| `hero-line.svg` | `1312:303` | CTA underline — reproduced as a 1.8 px `bg-foreground` span |
| `hero-divider.svg` | `1312:308` / `1312:312` | info-bar rules — reproduced as 1 px `bg-foreground/35` spans |

### `public/assets/shared/`

| File | From | Role |
|------|------|------|
| `swirl-mask.webp` | `2161:183` / `2161:275` | **alpha mask** for the swirl — both boards export it byte-identically, so one copy is tinted per section |
| `wordmark-mask.webp` | `1312:286` / `2149:21` | **alpha mask** for the `brewns` wordmark, painted with the header's active foreground |

### `public/assets/menu/`

| File | From | Role |
|------|------|------|
| `menu-espresso.webp` | `2246:1351` | card 01 still |
| `menu-latte.webp` | `2246:1410` | card 02 still |
| `menu-iced-coffee.webp` | `2246:1412` | card 03 still — the only one that spills out of its card |
| `menu-cinnamon.webp` | `2246:1353` | card 04 still |
| `menu-receipt.webp` | `2229:207` | the receipt revealed on hover (832×1890) |
| `menu-arrow.svg` | `2149:36` | same glyph as the hero's, inlined in `ui/arrow-glyph.tsx` |
| `menu-dot.svg` / `menu-line.svg` | `2149:24` / `2149:38` | dot and rule — reproduced with tokens, as in the hero |

### `public/assets/locations/`

| File | From | Role |
|------|------|------|
| `clock.webp` | `2190:1078` | the dial — see the note below, it needed rebuilding |
| `cup.webp` | `2246:1446` | the iced latte that turns with scroll |

> [!warning] The dial's image fill exports empty
> `get_design_context` points at an image fill for `2190:1078` that downloads as
> a **fully transparent** PNG (alpha max 0) — a broken export on Figma's side,
> not a conversion fault. `download_assets` on the same node returns both a
> usable raw fill *and* a node render, and neither is usable alone: the raw fill
> has the right circular alpha but an uncorrected tone (230,226,223), while the
> render has the tone Figma actually paints (247,246,245) with the page
> background baked in as an opaque square. `clock.webp` is the render's RGB
> combined with the raw fill's alpha. Re-exporting means redoing that.

The two masks are alpha masks, not pictures: their own pixels are near-black
(logo) and near-white (swirl), and the colour comes from a token. Rendering them
as plain `<img>` would show the wrong artwork.

Figma asset URLs expire ~7 days after export; re-fetch from the node IDs above.

## Open questions for design

1. **Tablet / mobile frames** — needed before the hero can respond below 1024.
2. **Real link targets** — nav, ORDER ONLINE, EXPLORE MENU, VIEW FULL MENU and
   the social links are placeholders in `src/data/mocks/`.
3. **Card stills' crop values** (`frame` / `crop` in the menu mock) come straight
   from Figma's image fills; they only hold for these exact photographs.
4. **The cup's rotation cap** is `CUP_MAX_ROTATION` in `locations-dial.tsx`,
   currently 75° (2:30). It must stay at or below 90° (3 o'clock).
5. **The starter's cookie re-open button** sits bottom-left and overlaps
   `07:00 - 21:00`; the design has no such control.
